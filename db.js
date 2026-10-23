/* ==========================================
   SERFIT - BANCO DE DADOS (SQLite)
========================================== */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");


const pastaDados = path.join(__dirname, "data");

fs.mkdirSync(pastaDados, { recursive: true });

const db = new DatabaseSync(path.join(pastaDados, "serfit.db"));


db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        nome        TEXT NOT NULL UNIQUE COLLATE NOCASE,
        senha_hash  TEXT NOT NULL,
        tipo        TEXT NOT NULL CHECK (tipo IN ('aluno', 'professor', 'gestao')),
        criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessoes (
        token       TEXT PRIMARY KEY,
        usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avisos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        texto       TEXT NOT NULL,
        autor       TEXT NOT NULL,
        criado_em   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS cobrancas (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        aluno_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        mes             TEXT NOT NULL,  -- formato AAAA-MM
        valor_centavos  INTEGER NOT NULL,
        situacao        TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (situacao IN ('paga', 'pendente', 'atrasada')),
        pago_em         TEXT,
        UNIQUE (aluno_id, mes)
    );
`);

db.exec("PRAGMA foreign_keys = ON");


// colunas novas em bancos criados antes do cadastro
const colunasUsuarios = db.prepare("PRAGMA table_info(usuarios)").all()
    .map(coluna => coluna.name);

if (!colunasUsuarios.includes("status")) {
    // ativo = pode entrar; pendente = professor aguardando aprovação
    db.exec("ALTER TABLE usuarios ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'");
}

if (!colunasUsuarios.includes("turno")) {
    // manha | tarde (só professores)
    db.exec("ALTER TABLE usuarios ADD COLUMN turno TEXT");
}


/* ==========================================
   SENHAS (scrypt + salt)
========================================== */

function gerarHash(senha) {

    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(senha, salt, 64).toString("hex");

    return `${salt}:${hash}`;
}


function conferirSenha(senha, armazenado) {

    const [salt, hash] = armazenado.split(":");

    const calculado = crypto.scryptSync(senha, salt, 64);

    return crypto.timingSafeEqual(calculado, Buffer.from(hash, "hex"));
}


/* ==========================================
   USUÁRIOS
========================================== */

function normalizarNome(nome) {

    return nome.trim().replace(/\s+/g, " ").toUpperCase();
}


function criarUsuario(nome, senha, tipo, { status = "ativo", turno = null } = {}) {

    const { lastInsertRowid } = db.prepare(
        "INSERT INTO usuarios (nome, senha_hash, tipo, status, turno) VALUES (?, ?, ?, ?, ?)"
    ).run(normalizarNome(nome), gerarHash(senha), tipo, status, turno);

    return buscarUsuarioPorId(lastInsertRowid);
}


function buscarUsuarioPorNome(nome) {

    return db.prepare(
        "SELECT id, nome, senha_hash, tipo, status, turno FROM usuarios WHERE nome = ?"
    ).get(normalizarNome(nome));
}


function buscarUsuarioPorId(id) {

    return db.prepare(
        "SELECT id, nome, tipo, status, turno FROM usuarios WHERE id = ?"
    ).get(id);
}


function definirTurno(id, turno) {

    db.prepare("UPDATE usuarios SET turno = ? WHERE id = ?").run(turno, id);
}


function listarProfessoresPendentes() {

    return db.prepare(`
        SELECT id, nome, turno, criado_em
        FROM usuarios
        WHERE tipo = 'professor' AND status = 'pendente'
        ORDER BY criado_em
    `).all();
}


function aprovarProfessor(id) {

    const { changes } = db.prepare(
        "UPDATE usuarios SET status = 'ativo' WHERE id = ? AND tipo = 'professor' AND status = 'pendente'"
    ).run(id);

    return changes > 0;
}


function recusarProfessor(id) {

    const { changes } = db.prepare(
        "DELETE FROM usuarios WHERE id = ? AND tipo = 'professor' AND status = 'pendente'"
    ).run(id);

    return changes > 0;
}


function contarUsuarios() {

    return db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
}


/* ==========================================
   SESSÕES
========================================== */

const DURACAO_SESSAO = 1000 * 60 * 60 * 8; // 8 horas


function criarSessao(usuarioId) {

    const token = crypto.randomBytes(32).toString("hex");

    db.prepare(
        "INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)"
    ).run(token, usuarioId, Date.now() + DURACAO_SESSAO);

    return token;
}


function buscarSessao(token) {

    db.prepare("DELETE FROM sessoes WHERE expira_em < ?").run(Date.now());

    return db.prepare(`
        SELECT usuarios.id, usuarios.nome, usuarios.tipo, usuarios.turno
        FROM sessoes
        JOIN usuarios ON usuarios.id = sessoes.usuario_id AND usuarios.status = 'ativo'
        WHERE sessoes.token = ?
    `).get(token);
}


function apagarSessao(token) {

    db.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
}


/* ==========================================
   AVISOS
========================================== */

function listarAvisos(limite = 20) {

    return db.prepare(
        "SELECT id, texto, autor, criado_em FROM avisos ORDER BY criado_em DESC, id DESC LIMIT ?"
    ).all(limite);
}


function criarAviso(texto, autor) {

    const { lastInsertRowid } = db.prepare(
        "INSERT INTO avisos (texto, autor) VALUES (?, ?)"
    ).run(texto, autor);

    return db.prepare(
        "SELECT id, texto, autor, criado_em FROM avisos WHERE id = ?"
    ).get(lastInsertRowid);
}


function contarAvisos() {

    return db.prepare("SELECT COUNT(*) AS total FROM avisos").get().total;
}


/* ==========================================
   COBRANÇAS
========================================== */

const camposCobranca = `
    cobrancas.id,
    usuarios.nome AS aluno,
    cobrancas.mes,
    cobrancas.valor_centavos,
    cobrancas.situacao,
    cobrancas.pago_em
`;


function criarCobranca(alunoId, mes, valorCentavos, situacao = "pendente") {

    db.prepare(`
        INSERT OR IGNORE INTO cobrancas (aluno_id, mes, valor_centavos, situacao, pago_em)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        alunoId,
        mes,
        valorCentavos,
        situacao,
        situacao === "paga" ? `${mes}-05` : null
    );
}


function listarCobrancasDoAluno(alunoId) {

    return db.prepare(`
        SELECT ${camposCobranca}
        FROM cobrancas
        JOIN usuarios ON usuarios.id = cobrancas.aluno_id
        WHERE cobrancas.aluno_id = ?
        ORDER BY cobrancas.mes DESC
    `).all(alunoId);
}


function listarCobrancasDoMes(mes) {

    return db.prepare(`
        SELECT ${camposCobranca}
        FROM cobrancas
        JOIN usuarios ON usuarios.id = cobrancas.aluno_id
        WHERE cobrancas.mes = ?
        ORDER BY
            CASE cobrancas.situacao WHEN 'atrasada' THEN 0 WHEN 'pendente' THEN 1 ELSE 2 END,
            usuarios.nome
    `).all(mes);
}


function listarMesesComCobranca() {

    return db.prepare(
        "SELECT DISTINCT mes FROM cobrancas ORDER BY mes DESC"
    ).all().map(linha => linha.mes);
}


function atualizarSituacaoCobranca(id, situacao) {

    const pagoEm = situacao === "paga"
        ? new Date().toISOString().slice(0, 10)
        : null;

    const { changes } = db.prepare(
        "UPDATE cobrancas SET situacao = ?, pago_em = ? WHERE id = ?"
    ).run(situacao, pagoEm, id);

    return changes > 0;
}


function contarCobrancas() {

    return db.prepare("SELECT COUNT(*) AS total FROM cobrancas").get().total;
}


module.exports = {
    DURACAO_SESSAO,
    criarUsuario,
    buscarUsuarioPorNome,
    buscarUsuarioPorId,
    definirTurno,
    listarProfessoresPendentes,
    aprovarProfessor,
    recusarProfessor,
    contarUsuarios,
    conferirSenha,
    criarSessao,
    buscarSessao,
    apagarSessao,
    listarAvisos,
    criarAviso,
    contarAvisos,
    criarCobranca,
    listarCobrancasDoAluno,
    listarCobrancasDoMes,
    listarMesesComCobranca,
    atualizarSituacaoCobranca,
    contarCobrancas
};
