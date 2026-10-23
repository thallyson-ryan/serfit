/* ==========================================
   SERFIT - DADOS INICIAIS
   Rode com: npm run seed
   Só cria o que ainda não existe no banco.
   Alunos e professores se cadastram pelo site.
   Troque a senha da gestão antes de colocar o site online.
========================================== */

const {
    criarUsuario,
    buscarUsuarioPorNome,
    criarAviso,
    contarAvisos
} = require("./db");


const usuariosIniciais = [
    { nome: "GESTAO", senha: "1234", tipo: "gestao", master: true }
];


const avisosIniciais = [
    { autor: "SERFIT", texto: "No feriado de 2 de novembro a academia abre das 05:00 às 12:00." },
    { autor: "SERFIT", texto: "Nova turma de zumba aos sábados, às 09:00, com a professora Marina." }
];


function semear() {

    usuariosIniciais.forEach(usuario => {

        if (buscarUsuarioPorNome(usuario.nome)) {
            return;
        }

        criarUsuario(usuario.nome, usuario.senha, usuario.tipo, { master: usuario.master });

        console.log(`Usuário criado: ${usuario.nome} (${usuario.tipo})`);
    });


    if (contarAvisos() === 0) {

        avisosIniciais.forEach(aviso => criarAviso(aviso.texto, aviso.autor));

        console.log(`Avisos criados: ${avisosIniciais.length}`);
    }
}


if (require.main === module) {
    semear();
}


module.exports = { semear };
