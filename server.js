/* ==========================================
   SERFIT - SERVIDOR
   Rode com: npm start
========================================== */

const path = require("node:path");
const express = require("express");

const {
    DURACAO_SESSAO,
    PLANOS,
    mesAtual,
    criarUsuario,
    criarCobranca,
    perfilDoAluno,
    listarProfessoresAtivos,
    definirProfessorDoAluno,
    definirPlanoDoAluno,
    gerarMensalidadesDoMes,
    listarAlunosDoProfessor,
    buscarUsuarioPorNome,
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
    listarCobrancasDoAluno,
    listarCobrancasDoMes,
    listarMesesComCobranca,
    atualizarSituacaoCobranca
} = require("./db");

const { semear } = require("./seed");


const app = express();

const PORTA = process.env.PORT || 3000;

const COOKIE = "serfit_sessao";


// banco vazio na primeira execução: cria os dados iniciais
if (contarUsuarios() === 0) {
    semear();
}

gerarMensalidadesDoMes();


app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


/* ==========================================
   COOKIES
========================================== */

function lerToken(req) {

    const cookies = req.headers.cookie || "";

    const par = cookies
        .split(";")
        .map(item => item.trim())
        .find(item => item.startsWith(`${COOKIE}=`));

    return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : null;
}


function opcoesCookie() {

    return {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: DURACAO_SESSAO
    };
}


/* ==========================================
   LIMITE DE TENTATIVAS
========================================== */

const tentativas = new Map();

const MAX_TENTATIVAS = 5;

const JANELA_BLOQUEIO = 1000 * 60 * 5; // 5 minutos


function bloqueado(chave) {

    const registro = tentativas.get(chave);

    if (!registro) {
        return false;
    }

    if (Date.now() - registro.inicio > JANELA_BLOQUEIO) {
        tentativas.delete(chave);
        return false;
    }

    return registro.falhas >= MAX_TENTATIVAS;
}


function registrarFalha(chave) {

    const registro = tentativas.get(chave) || { falhas: 0, inicio: Date.now() };

    registro.falhas++;

    tentativas.set(chave, registro);
}


/* ==========================================
   ROTAS DE LOGIN
========================================== */

app.post("/api/login", (req, res) => {

    const nome = String(req.body?.nome || "").trim();

    const senha = String(req.body?.senha || "");

    const chave = `${req.ip}:${nome.toUpperCase()}`;


    if (!nome || !senha) {
        return res.status(400).json({ erro: "Informe nome e senha." });
    }

    if (bloqueado(chave)) {
        return res.status(429).json({
            erro: "Muitas tentativas. Aguarde 5 minutos e tente de novo."
        });
    }


    const usuario = buscarUsuarioPorNome(nome);

    if (!usuario || !conferirSenha(senha, usuario.senha_hash)) {

        registrarFalha(chave);

        return res.status(401).json({ erro: "Nome ou senha incorretos." });
    }


    tentativas.delete(chave);

    if (usuario.status === "pendente") {
        return res.status(403).json({
            erro: "Seu cadastro de professor está aguardando aprovação do professor master."
        });
    }

    iniciarSessao(res, usuario);
});


function iniciarSessao(res, usuario) {

    const token = criarSessao(usuario.id);

    res.cookie(COOKIE, token, opcoesCookie());

    res.json(dadosPublicos(usuario));
}


function dadosPublicos(usuario) {

    return {
        nome: usuario.nome,
        tipo: usuario.tipo,
        turno: usuario.turno,
        master: Boolean(usuario.master)
    };
}


/* ==========================================
   CRIAR CONTA
========================================== */

const NOME_VALIDO = /^[A-ZÀ-ÖØ-Ý ]{3,30}$/; // letras (com acento) e espaços


app.post("/api/cadastro", (req, res) => {

    const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ").toUpperCase();

    const senha = String(req.body?.senha || "");

    const tipo = String(req.body?.tipo || "");

    const turno = String(req.body?.turno || "");

    const plano = String(req.body?.plano || "");

    const chave = `cadastro:${req.ip}`;


    if (bloqueado(chave)) {
        return res.status(429).json({
            erro: "Muitos cadastros seguidos. Aguarde 5 minutos e tente de novo."
        });
    }

    if (!NOME_VALIDO.test(nome)) {
        return res.status(400).json({
            erro: "O nome deve ter de 3 a 30 letras, sem números ou símbolos."
        });
    }

    if (senha.length < 6 || senha.length > 72) {
        return res.status(400).json({ erro: "A senha deve ter de 6 a 72 caracteres." });
    }

    if (!["aluno", "professor"].includes(tipo)) {
        return res.status(400).json({ erro: "Escolha se a conta é de aluno ou de professor." });
    }

    if (tipo === "professor" && !["manha", "tarde"].includes(turno)) {
        return res.status(400).json({ erro: "Escolha o turno do professor." });
    }

    if (tipo === "aluno" && !PLANOS[plano]) {
        return res.status(400).json({ erro: "Escolha o seu plano." });
    }

    if (buscarUsuarioPorNome(nome)) {
        return res.status(409).json({ erro: "Já existe uma conta com esse nome." });
    }


    registrarFalha(chave); // conta como tentativa para limitar cadastros em massa


    if (tipo === "professor") {

        criarUsuario(nome, senha, "professor", { status: "pendente", turno });

        return res.status(202).json({
            pendente: true,
            mensagem: "Cadastro enviado. Você poderá entrar assim que o professor master aprovar."
        });
    }


    // aluno nasce sem professor; a mensalidade do mês segue o plano
    const usuario = criarUsuario(nome, senha, "aluno", { plano });

    criarCobranca(usuario.id, mesAtual(), PLANOS[plano].valor_centavos);

    res.status(201);

    iniciarSessao(res, usuario);
});


app.post("/api/logout", (req, res) => {

    const token = lerToken(req);

    if (token) {
        apagarSessao(token);
    }

    res.clearCookie(COOKIE, { ...opcoesCookie(), maxAge: undefined });

    res.json({ ok: true });
});


app.get("/api/me", (req, res) => {

    const token = lerToken(req);

    const usuario = token ? buscarSessao(token) : null;

    if (!usuario) {
        return res.status(401).json({ erro: "Não autenticado." });
    }

    res.json(dadosPublicos(usuario));
});


/* ==========================================
   PERMISSÕES
========================================== */

function exigirLogin(...tipos) {

    return (req, res, next) => {

        const token = lerToken(req);

        const usuario = token ? buscarSessao(token) : null;

        if (!usuario) {
            return res.status(401).json({ erro: "Faça login para continuar." });
        }

        if (tipos.length && !tipos.includes(usuario.tipo)) {
            return res.status(403).json({ erro: "Você não tem acesso a isso." });
        }

        req.usuario = usuario;

        next();
    };
}


/* ==========================================
   PLANOS
========================================== */

app.get("/api/planos", (req, res) => {

    res.json(PLANOS);
});


/* ==========================================
   ALUNO: PLANO E PROFESSOR
========================================== */

app.get("/api/aluno/perfil", exigirLogin("aluno"), (req, res) => {

    res.json(perfilDoAluno(req.usuario.id));
});


app.get("/api/professores", exigirLogin("aluno"), (req, res) => {

    res.json(listarProfessoresAtivos());
});


app.put("/api/aluno/professor", exigirLogin("aluno"), (req, res) => {

    const valor = req.body?.professorId;

    const professorId = valor === null || valor === "" || valor === undefined
        ? null
        : Number(valor);

    if (professorId !== null && !Number.isInteger(professorId)) {
        return res.status(400).json({ erro: "Professor inválido." });
    }

    if (!definirProfessorDoAluno(req.usuario.id, professorId)) {
        return res.status(404).json({ erro: "Professor não encontrado." });
    }

    res.json(perfilDoAluno(req.usuario.id));
});


app.put("/api/aluno/plano", exigirLogin("aluno"), (req, res) => {

    const plano = String(req.body?.plano || "");

    if (!PLANOS[plano]) {
        return res.status(400).json({ erro: "Plano inválido." });
    }

    definirPlanoDoAluno(req.usuario.id, plano);

    res.json(perfilDoAluno(req.usuario.id));
});


/* ==========================================
   PROFESSOR: MEUS ALUNOS
========================================== */

app.get("/api/professor/alunos", exigirLogin("professor"), (req, res) => {

    res.json(listarAlunosDoProfessor(req.usuario.id));
});


/* ==========================================
   APROVAÇÃO DE PROFESSORES
   (gestão ou professor master)
========================================== */

function exigirGestorDeProfessores(req, res, next) {

    exigirLogin("gestao", "professor")(req, res, () => {

        if (req.usuario.tipo === "professor" && !req.usuario.master) {
            return res.status(403).json({ erro: "Só o professor master pode aprovar professores." });
        }

        next();
    });
}


app.get("/api/professores/pendentes", exigirGestorDeProfessores, (req, res) => {

    res.json(listarProfessoresPendentes());
});


app.post("/api/professores/:id/aprovar", exigirGestorDeProfessores, (req, res) => {

    if (!aprovarProfessor(Number(req.params.id))) {
        return res.status(404).json({ erro: "Cadastro pendente não encontrado." });
    }

    res.json({ ok: true });
});


app.delete("/api/professores/:id", exigirGestorDeProfessores, (req, res) => {

    if (!recusarProfessor(Number(req.params.id))) {
        return res.status(404).json({ erro: "Cadastro pendente não encontrado." });
    }

    res.json({ ok: true });
});


/* ==========================================
   ROTAS DE AVISOS
========================================== */

// público: aparece na página inicial
app.get("/api/avisos", (req, res) => {

    res.json(listarAvisos());
});


app.post("/api/avisos", exigirLogin("professor", "gestao"), (req, res) => {

    const texto = String(req.body?.texto || "").trim();

    if (!texto) {
        return res.status(400).json({ erro: "Escreva o aviso antes de publicar." });
    }

    if (texto.length > 500) {
        return res.status(400).json({ erro: "O aviso pode ter no máximo 500 caracteres." });
    }

    const autor = req.usuario.tipo === "professor"
        ? `Prof. ${req.usuario.nome}`
        : "SERFIT";

    res.status(201).json(criarAviso(texto, autor));
});


/* ==========================================
   ROTAS DE COBRANÇAS
========================================== */

app.get("/api/cobrancas/minhas", exigirLogin("aluno"), (req, res) => {

    gerarMensalidadesDoMes();

    res.json(listarCobrancasDoAluno(req.usuario.id));
});


app.get("/api/cobrancas/meses", exigirLogin("gestao"), (req, res) => {

    gerarMensalidadesDoMes();

    res.json(listarMesesComCobranca());
});


app.get("/api/cobrancas", exigirLogin("gestao"), (req, res) => {

    const mes = String(req.query.mes || "");

    if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ erro: "Informe o mês no formato AAAA-MM." });
    }

    res.json(listarCobrancasDoMes(mes));
});


app.patch("/api/cobrancas/:id", exigirLogin("gestao"), (req, res) => {

    const id = Number(req.params.id);

    const situacao = String(req.body?.situacao || "");

    if (!["paga", "pendente", "atrasada"].includes(situacao)) {
        return res.status(400).json({ erro: "Situação inválida." });
    }

    if (!atualizarSituacaoCobranca(id, situacao)) {
        return res.status(404).json({ erro: "Cobrança não encontrada." });
    }

    res.json({ ok: true });
});


app.listen(PORTA, () => {
    console.log(`SERFIT rodando em http://localhost:${PORTA}`);
});
