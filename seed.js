/* ==========================================
   SERFIT - DADOS INICIAIS
   Rode com: npm run seed
   Só cria o que ainda não existe no banco.
   Troque as senhas antes de colocar o site online.
========================================== */

const {
    criarUsuario,
    buscarUsuarioPorNome,
    definirTurno,
    definirProfessorDoAluno,
    criarAviso,
    contarAvisos,
    criarCobranca,
    contarCobrancas
} = require("./db");


// professores primeiro: alunos podem apontar para eles
const usuariosIniciais = [
    { nome: "RAFAEL",  senha: "1234", tipo: "professor", turno: "manha" },
    { nome: "MARINA",  senha: "1234", tipo: "professor", turno: "manha" },
    { nome: "LUCAS",   senha: "1234", tipo: "professor", turno: "tarde" },
    { nome: "JULIANA", senha: "1234", tipo: "professor", turno: "tarde" },
    { nome: "CAIO",    senha: "1234", tipo: "aluno", plano: "musculacao", professor: "RAFAEL" },
    { nome: "ANA",     senha: "1234", tipo: "aluno", plano: "musculacao" },
    { nome: "BRUNO",   senha: "1234", tipo: "aluno", plano: "musculacao" },
    { nome: "DIEGO",   senha: "1234", tipo: "aluno", plano: "musculacao" },
    { nome: "ELISA",   senha: "1234", tipo: "aluno", plano: "musculacao" },
    { nome: "GESTAO",  senha: "1234", tipo: "gestao" }
];


const avisosIniciais = [
    { autor: "SERFIT", texto: "No feriado de 2 de novembro a academia abre das 05:00 às 12:00." },
    { autor: "SERFIT", texto: "Nova turma de zumba aos sábados, às 09:00, com a professora Marina." }
];


// [aluno, mês, valor em centavos, situação]
const cobrancasIniciais = [
    ["CAIO",  "2026-08", 12000, "paga"],
    ["CAIO",  "2026-09", 12000, "paga"],
    ["CAIO",  "2026-10", 12000, "paga"],
    ["ANA",   "2026-10", 12000, "pendente"],
    ["BRUNO", "2026-09", 12000, "paga"],
    ["BRUNO", "2026-10", 12000, "atrasada"],
    ["DIEGO", "2026-10", 12000, "paga"],
    ["ELISA", "2026-10", 12000, "pendente"]
];


function semear() {

    usuariosIniciais.forEach(usuario => {

        let registro = buscarUsuarioPorNome(usuario.nome);

        if (registro) {

            if (usuario.turno && !registro.turno) {
                definirTurno(registro.id, usuario.turno);
            }

        } else {

            registro = criarUsuario(usuario.nome, usuario.senha, usuario.tipo, {
                turno: usuario.turno,
                plano: usuario.plano
            });

            console.log(`Usuário criado: ${usuario.nome} (${usuario.tipo})`);
        }


        if (usuario.professor && !buscarUsuarioPorNome(usuario.nome).professor_id) {
            definirProfessorDoAluno(registro.id, buscarUsuarioPorNome(usuario.professor).id);
        }
    });


    if (contarAvisos() === 0) {

        avisosIniciais.forEach(aviso => criarAviso(aviso.texto, aviso.autor));

        console.log(`Avisos criados: ${avisosIniciais.length}`);
    }


    if (contarCobrancas() === 0) {

        cobrancasIniciais.forEach(([nome, mes, valor, situacao]) => {
            criarCobranca(buscarUsuarioPorNome(nome).id, mes, valor, situacao);
        });

        console.log(`Cobranças criadas: ${cobrancasIniciais.length}`);
    }
}


if (require.main === module) {
    semear();
}


module.exports = { semear };
