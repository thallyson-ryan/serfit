/* ==========================================
   SERFIT - SISTEMA
   Login no banco de dados (server.js);
   demais dados ainda demonstrativos
========================================== */


/* ==========================================
   DADOS DEMONSTRATIVOS
========================================== */

const turnos = {
    manha: { nome: "Manhã", horario: "05:00 — 13:00" },
    tarde: { nome: "Tarde", horario: "13:00 — 22:00" }
};

const professores = [
    { nome: "RAFAEL",  turno: "manha", area: "Musculação" },
    { nome: "MARINA",  turno: "manha", area: "Musculação e zumba" },
    { nome: "LUCAS",   turno: "tarde", area: "Musculação" },
    { nome: "JULIANA", turno: "tarde", area: "Musculação e zumba" }
];

const aulasZumba = [
    { id: 1, dia: "Terça",  hora: "19:00", professor: "JULIANA", vagas: 20, inscritos: 14 },
    { id: 2, dia: "Quinta", hora: "19:00", professor: "JULIANA", vagas: 20, inscritos: 20 },
    { id: 3, dia: "Sábado", hora: "09:00", professor: "MARINA",  vagas: 20, inscritos: 9 }
];

const reservasZumba = [];

// avisos e cobranças vêm do banco (server.js)
let avisos = [];

const estacionamento = {
    vagas: 20,
    veiculos: [
        { placa: "ABC1D23", cliente: "CAIO",  entrada: "06:12" },
        { placa: "QWE4R56", cliente: "DIEGO", entrada: "07:40" }
    ],
    registros: [
        { tipo: "entrada", placa: "QWE4R56", cliente: "DIEGO", hora: "07:40" },
        { tipo: "saida",   placa: "RTY7U89", cliente: "ANA",   hora: "07:05" },
        { tipo: "entrada", placa: "ABC1D23", cliente: "CAIO",  hora: "06:12" },
        { tipo: "entrada", placa: "RTY7U89", cliente: "ANA",   hora: "05:48" }
    ],
    // entradas por hora (05h a 21h)
    fluxo: { 5: 3, 6: 7, 7: 9, 8: 4, 9: 2, 10: 1, 11: 2, 12: 3, 13: 2, 14: 1, 15: 2, 16: 4, 17: 8, 18: 11, 19: 9, 20: 5, 21: 2 }
};

const situacaoTexto = {
    paga: "PAGA",
    pendente: "PENDENTE",
    atrasada: "ATRASADA"
};


/* ==========================================
   UTILITÁRIOS
========================================== */

function escaparHtml(texto) {

    const div = document.createElement("div");

    div.textContent = texto;

    return div.innerHTML;
}


function formatarValor(valor) {

    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


function formatarCentavos(centavos) {

    return formatarValor(centavos / 100);
}


const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];


// "2026-10" -> "Outubro / 2026"
function formatarMes(mes) {

    const [ano, numero] = mes.split("-");

    return `${nomesMeses[Number(numero) - 1]} / ${ano}`;
}


// "2026-10-20 14:05:00" -> "20/10/2026"
function formatarData(dataHora) {

    const [ano, mes, dia] = dataHora.slice(0, 10).split("-");

    return `${dia}/${mes}/${ano}`;
}


async function api(caminho, opcoes = {}) {

    const resposta = await fetch(caminho, {
        ...opcoes,
        headers: { "Content-Type": "application/json", ...opcoes.headers }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao falar com o servidor.");
    }

    return dados;
}


function horaAtual() {

    return new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* ==========================================
   CONTROLE DE TELAS
========================================== */

function mostrarPagina(id) {

    const paginas = document.querySelectorAll(".page");

    paginas.forEach(pagina => {
        pagina.classList.remove("active");
    });

    const pagina = document.getElementById(id);

    if (pagina) {
        pagina.classList.add("active");
    }

    window.scrollTo(0, 0);
}


/* ==========================================
   ABRIR LOGIN
========================================== */

function mostrarLogin() {

    mostrarPagina("login");

    mostrarAba("entrar");

    document.getElementById("nome").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("erro-login").textContent = "";
}


/* ==========================================
   ABAS ENTRAR / CRIAR CONTA
========================================== */

function mostrarAba(aba) {

    const cadastro = aba === "cadastro";

    document.getElementById("form-login").classList.toggle("hidden", cadastro);
    document.getElementById("form-cadastro").classList.toggle("hidden", !cadastro);

    document.getElementById("aba-entrar").classList.toggle("active", !cadastro);
    document.getElementById("aba-cadastro").classList.toggle("active", cadastro);

    document.getElementById("titulo-acesso").textContent =
        cadastro ? "Criar conta" : "Entrar";

    if (cadastro) {

        document.getElementById("form-cadastro").reset();
        document.getElementById("erro-cadastro").textContent = "";
        document.getElementById("sucesso-cadastro").textContent = "";

        atualizarTipoConta();
    }
}


function tipoContaEscolhido() {

    return document.querySelector("input[name='tipo-conta']:checked").value;
}


function atualizarTipoConta() {

    const professor = tipoContaEscolhido() === "professor";

    document.getElementById("grupo-turno").classList.toggle("hidden", !professor);
    document.getElementById("aviso-professor").classList.toggle("hidden", !professor);
    document.getElementById("grupo-plano").classList.toggle("hidden", professor);
}


async function criarConta(event) {

    event.preventDefault();

    const erro = document.getElementById("erro-cadastro");

    const sucesso = document.getElementById("sucesso-cadastro");

    const botao = event.target.querySelector("button[type=submit]");

    const nome = document.getElementById("cadastro-nome").value.trim();

    const senha = document.getElementById("cadastro-senha").value;

    const confirmar = document.getElementById("cadastro-confirmar").value;

    const tipo = tipoContaEscolhido();

    const turno = document.getElementById("cadastro-turno").value;

    const plano = document.querySelector("input[name='plano-cadastro']:checked").value;


    erro.textContent = "";

    sucesso.textContent = "";


    if (senha !== confirmar) {

        erro.textContent = "As senhas não são iguais.";

        return;
    }


    botao.disabled = true;

    try {

        const dados = await api("/api/cadastro", {
            method: "POST",
            body: JSON.stringify({ nome, senha, tipo, turno, plano })
        });


        if (dados.pendente) {

            event.target.reset();

            atualizarTipoConta();

            sucesso.textContent = `✓ ${dados.mensagem}`;

            return;
        }


        abrirPainel(dados);

    } catch (falha) {

        erro.textContent = falha.message;

    } finally {

        botao.disabled = false;

    }
}


/* ==========================================
   VOLTAR PARA HOME
========================================== */

function voltarInicio() {
    mostrarPagina("home");
}


/* ==========================================
   LOGIN
========================================== */

async function realizarLogin(event) {

    event.preventDefault();

    const nome = document
        .getElementById("nome")
        .value
        .trim();

    const senha = document
        .getElementById("senha")
        .value;

    const erro = document.getElementById("erro-login");

    const botao = event.target.querySelector("button[type=submit]");


    erro.textContent = "";

    botao.disabled = true;


    try {

        const resposta = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, senha })
        });

        const dados = await resposta.json();


        if (!resposta.ok) {

            erro.textContent = dados.erro || "Não foi possível entrar.";

            return;
        }


        abrirPainel(dados);

    } catch {

        erro.textContent =
            "Sem conexão com o servidor. Tente novamente.";

    } finally {

        botao.disabled = false;

    }

}


/* ==========================================
   ABRIR PAINEL DO USUÁRIO
========================================== */

function abrirPainel(usuario) {

    if (usuario.tipo === "aluno") {

        document.getElementById(
            "nome-aluno-header"
        ).textContent = usuario.nome;

        document.getElementById(
            "nome-aluno-boas-vindas"
        ).textContent = `${usuario.nome}.`;

        document.getElementById(
            "avatar-aluno"
        ).textContent = usuario.nome[0];

        mostrarPagina("aluno");

        carregarPerfilDoAluno();

        carregarCobrancasDoAluno();

    }


    if (usuario.tipo === "professor") {

        document.getElementById(
            "nome-professor-header"
        ).textContent = usuario.nome;

        document.getElementById(
            "nome-professor-boas-vindas"
        ).textContent = `${usuario.nome}.`;

        document.getElementById(
            "avatar-professor"
        ).textContent = usuario.nome[0];

        const turno = turnos[usuario.turno];

        const badge = document.getElementById("turno-professor");

        badge.textContent = turno
            ? `TURNO DA ${turno.nome.toUpperCase()} · ${turno.horario}`
            : "";

        badge.classList.toggle("hidden", !turno);

        mostrarPagina("professor");

        carregarAlunosDoProfessor();

    }


    if (usuario.tipo === "gestao") {

        mostrarPagina("gestao");

        carregarPendentes();

        carregarCobrancasDaGestao();

    }

}


async function restaurarSessao() {

    try {

        const resposta = await fetch("/api/me");

        if (resposta.ok) {
            abrirPainel(await resposta.json());
        }

    } catch {
        // sem servidor: fica na página inicial
    }

}


/* ==========================================
   LOGOUT
========================================== */

async function logout() {

    try {
        await fetch("/api/logout", { method: "POST" });
    } catch {
        // mesmo sem resposta, volta para o início
    }

    mostrarPagina("home");

}


/* ==========================================
   PROFESSOR - ADICIONAR EXERCÍCIO
========================================== */

function adicionarExercicio() {

    const lista =
        document.getElementById("lista-exercicios");


    const numero =
        lista.children.length + 1;


    const exercicio =
        document.createElement("div");


    exercicio.className =
        "exercicio-editavel";


    exercicio.innerHTML = `

        <div>

            <span>
                ${String(numero).padStart(2, "0")}
            </span>

            <input
                type="text"
                placeholder="Nome do exercício"
            >

        </div>

        <input
            type="text"
            value="3"
            class="campo-pequeno"
        >

        <span>×</span>

        <input
            type="text"
            value="12"
            class="campo-pequeno"
        >

        <button
            onclick="removerExercicio(this)"
        >
            ×
        </button>

    `;


    lista.appendChild(exercicio);

}


/* ==========================================
   REMOVER EXERCÍCIO
========================================== */

function removerExercicio(botao) {

    const exercicio =
        botao.parentElement;


    exercicio.remove();


    atualizarNumeracao();

}


/* ==========================================
   ATUALIZAR NUMERAÇÃO
========================================== */

function atualizarNumeracao() {

    const exercicios =
        document.querySelectorAll(
            ".exercicio-editavel"
        );


    exercicios.forEach(
        (exercicio, index) => {

            const numero =
                exercicio.querySelector(
                    "div span"
                );

            numero.textContent =
                String(index + 1).padStart(2, "0");

        }
    );

}


/* ==========================================
   SALVAR TREINO
========================================== */

function salvarTreino() {

    const mensagem =
        document.getElementById(
            "mensagem-treino"
        );


    if (!alunoSelecionado) {

        mensagem.textContent = "Selecione um aluno primeiro.";

        return;
    }


    mensagem.textContent =
        `✓ Treino de ${alunoSelecionado} salvo com sucesso!`;


    setTimeout(() => {

        mensagem.textContent = "";

    }, 3000);

}


/* ==========================================
   PROFESSOR - MEUS ALUNOS
========================================== */

let alunoSelecionado = null;


async function carregarAlunosDoProfessor() {

    const lista = document.getElementById("lista-alunos");

    let alunos;

    try {

        alunos = await api("/api/professor/alunos");

    } catch (falha) {

        lista.innerHTML = `<p class="erro">${escaparHtml(falha.message)}</p>`;

        return;
    }


    document.getElementById("total-alunos").textContent =
        String(alunos.length).padStart(2, "0");

    lista.innerHTML = alunos.length === 0
        ? `<p class="empty">Nenhum aluno escolheu você ainda.</p>`
        : alunos.map(aluno => `
            <button class="student-item" data-nome="${escaparHtml(aluno.nome)}" onclick="selecionarAluno(this)">
                <div class="student-avatar">${escaparHtml(aluno.nome[0])}</div>
                <div class="student-info">
                    <strong>${escaparHtml(aluno.nome)}</strong>
                    <span>${nomesPlanos[aluno.plano] || "Sem plano"}</span>
                </div>
                <span class="student-arrow">→</span>
            </button>
        `).join("");

    const primeiro = lista.querySelector(".student-item");

    if (primeiro) {
        selecionarAluno(primeiro);
    } else {
        alunoSelecionado = null;
        document.getElementById("aluno-selecionado").textContent = "—";
    }
}


function selecionarAluno(botao) {

    document.querySelectorAll("#lista-alunos .student-item")
        .forEach(item => item.classList.toggle("selected", item === botao));

    alunoSelecionado = botao.dataset.nome;

    document.getElementById("aluno-selecionado").textContent = alunoSelecionado;
}


/* ==========================================
   ALUNO - PLANO E PROFESSOR
========================================== */

const nomesPlanos = {
    musculacao: "Musculação · R$ 120,00",
    musculacao_danca: "Musculação e dança · R$ 160,00"
};


function nomeTurno(turno) {

    return turnos[turno] ? `Turno da ${turnos[turno].nome.toLowerCase()}` : "";
}


function mostrarPerfilDoAluno(perfil) {

    const professor = perfil.professor;

    document.getElementById("professor-aluno-nome").textContent =
        professor ? professor.nome : "Sem professor";

    document.getElementById("professor-aluno-turno").textContent =
        professor ? nomeTurno(professor.turno) : "Escolha um professor abaixo";

    document.getElementById("select-professor").value =
        professor ? String(professor.id) : "";


    document.getElementById("plano-atual-nome").textContent =
        nomesPlanos[perfil.plano] || "Escolha um plano";

    const opcao = document.querySelector(`input[name='plano-aluno'][value='${perfil.plano}']`);

    if (opcao) {
        opcao.checked = true;
    }
}


async function carregarPerfilDoAluno() {

    try {

        const [professores, perfil] = await Promise.all([
            api("/api/professores"),
            api("/api/aluno/perfil")
        ]);

        document.getElementById("select-professor").innerHTML =
            `<option value="">Sem professor</option>` +
            professores.map(professor => `
                <option value="${professor.id}">
                    ${escaparHtml(professor.nome)} · ${nomeTurno(professor.turno)}
                </option>
            `).join("");

        mostrarPerfilDoAluno(perfil);

    } catch (falha) {

        document.getElementById("mensagem-professor").textContent = falha.message;

    }
}


function mostrarMensagem(id, texto, erro = false) {

    const mensagem = document.getElementById(id);

    mensagem.textContent = texto;

    mensagem.classList.toggle("error", erro);

    if (!erro) {
        setTimeout(() => { mensagem.textContent = ""; }, 3000);
    }
}


async function salvarProfessor() {

    const valor = document.getElementById("select-professor").value;

    try {

        const perfil = await api("/api/aluno/professor", {
            method: "PUT",
            body: JSON.stringify({ professorId: valor === "" ? null : Number(valor) })
        });

        mostrarPerfilDoAluno(perfil);

        mostrarMensagem(
            "mensagem-professor",
            perfil.professor ? `✓ Agora seu professor é ${perfil.professor.nome}.` : "✓ Você está sem professor."
        );

    } catch (falha) {

        mostrarMensagem("mensagem-professor", falha.message, true);

    }
}


async function salvarPlano() {

    const escolhido = document.querySelector("input[name='plano-aluno']:checked");

    if (!escolhido) {
        return;
    }

    try {

        const perfil = await api("/api/aluno/plano", {
            method: "PUT",
            body: JSON.stringify({ plano: escolhido.value })
        });

        mostrarPerfilDoAluno(perfil);

        mostrarMensagem("mensagem-plano", "✓ Plano atualizado. A mensalidade deste mês já segue o novo valor.");

        carregarCobrancasDoAluno();

    } catch (falha) {

        mostrarMensagem("mensagem-plano", falha.message, true);

    }
}


/* ==========================================
   EQUIPE
========================================== */

function renderizarEquipe() {

    const lista = document.getElementById("lista-turnos");

    lista.innerHTML = Object.keys(turnos).map(chave => {

        const turno = turnos[chave];

        const nomes = professores
            .filter(professor => professor.turno === chave)
            .map(professor => `
                <div class="teacher-row">
                    <div class="student-avatar">${professor.nome[0]}</div>
                    <div>
                        <strong>${professor.nome}</strong>
                        <span>${professor.area}</span>
                    </div>
                </div>
            `)
            .join("");

        return `
            <article class="shift-card">
                <small>TURNO DA ${turno.nome.toUpperCase()}</small>
                <h3>${turno.horario}</h3>
                ${nomes}
            </article>
        `;

    }).join("");
}


/* ==========================================
   COMUNICAÇÃO - AVISOS
========================================== */

function renderizarAvisos() {

    const html = avisos.length === 0
        ? `<p class="empty">Nenhum aviso no momento.</p>`
        : avisos.map(aviso => `
            <article class="aviso-item">
                <div>
                    <small>${formatarData(aviso.criado_em)} · ${escaparHtml(aviso.autor)}</small>
                    <p>${escaparHtml(aviso.texto)}</p>
                </div>
            </article>
        `).join("");

    ["mural-avisos-home", "mural-avisos-aluno", "mural-avisos-professor"]
        .forEach(id => {
            document.getElementById(id).innerHTML = html;
        });
}


async function carregarAvisos() {

    try {

        avisos = await api("/api/avisos");

    } catch {

        avisos = [];

    }

    renderizarAvisos();
}


async function publicarAviso() {

    const campo = document.getElementById("novo-aviso");

    const mensagem = document.getElementById("mensagem-aviso");

    const texto = campo.value.trim();


    if (!texto) {

        mensagem.textContent = "Escreva o aviso antes de publicar.";

        mensagem.classList.add("error");

        return;
    }


    try {

        const aviso = await api("/api/avisos", {
            method: "POST",
            body: JSON.stringify({ texto })
        });

        avisos.unshift(aviso);

    } catch (erro) {

        mensagem.textContent = erro.message;

        mensagem.classList.add("error");

        return;
    }


    campo.value = "";

    mensagem.classList.remove("error");

    mensagem.textContent = "✓ Aviso publicado para todos os alunos.";

    renderizarAvisos();


    setTimeout(() => {

        mensagem.textContent = "";

    }, 3000);
}


/* ==========================================
   ÁREA DA ZUMBA
========================================== */

function renderizarZumba() {

    document.getElementById("grade-zumba-home").innerHTML =
        aulasZumba.map(aula => {

            const lotada = aula.inscritos >= aula.vagas;

            return `
                <article class="zumba-card">
                    <small>${aula.dia.toUpperCase()}</small>
                    <h3>${aula.hora}</h3>
                    <p>Prof. ${aula.professor}</p>
                    <span class="vagas ${lotada ? "lotada" : ""}">
                        ${lotada ? "TURMA LOTADA" : `${aula.vagas - aula.inscritos} VAGAS`}
                    </span>
                </article>
            `;

        }).join("");


    document.getElementById("grade-zumba-aluno").innerHTML =
        aulasZumba.map(aula => {

            const reservada = reservasZumba.includes(aula.id);

            const lotada = aula.inscritos >= aula.vagas && !reservada;

            let botao = `<button class="btn-small" onclick="reservarZumba(${aula.id})">Reservar</button>`;

            if (reservada) {
                botao = `<button class="btn-small ghost" onclick="cancelarZumba(${aula.id})">Cancelar</button>`;
            }

            if (lotada) {
                botao = `<span class="status-tag atrasada">LOTADA</span>`;
            }

            return `
                <div class="zumba-reserva">
                    <div>
                        <strong>${aula.dia} · ${aula.hora}</strong>
                        <span>Prof. ${aula.professor} · ${aula.inscritos}/${aula.vagas} inscritos</span>
                    </div>
                    ${reservada ? `<span class="status-tag paga">RESERVADA</span>` : ""}
                    ${botao}
                </div>
            `;

        }).join("");
}


function reservarZumba(id) {

    const aula = aulasZumba.find(item => item.id === id);

    if (!aula || aula.inscritos >= aula.vagas || reservasZumba.includes(id)) {
        return;
    }

    aula.inscritos++;

    reservasZumba.push(id);

    renderizarZumba();
}


function cancelarZumba(id) {

    const aula = aulasZumba.find(item => item.id === id);

    const indice = reservasZumba.indexOf(id);

    if (!aula || indice === -1) {
        return;
    }

    aula.inscritos--;

    reservasZumba.splice(indice, 1);

    renderizarZumba();
}


/* ==========================================
   SISTEMA DE COBRANÇAS
========================================== */

function tabelaCobrancas(linhas, paraGestao) {

    if (linhas.length === 0) {
        return `<p class="empty">Nenhuma cobrança encontrada.</p>`;
    }

    return `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        ${paraGestao ? "<th>Aluno</th>" : ""}
                        <th>Mês</th>
                        <th>Valor</th>
                        <th>Situação</th>
                        ${paraGestao ? "<th></th>" : ""}
                    </tr>
                </thead>
                <tbody>
                    ${linhas.map(cobranca => `
                        <tr>
                            ${paraGestao ? `<td><strong>${escaparHtml(cobranca.aluno)}</strong></td>` : ""}
                            <td>${formatarMes(cobranca.mes)}</td>
                            <td>${formatarCentavos(cobranca.valor_centavos)}</td>
                            <td>
                                <span class="status-tag ${cobranca.situacao}">
                                    ${situacaoTexto[cobranca.situacao]}
                                </span>
                            </td>
                            ${paraGestao ? `
                                <td class="cell-action">
                                    ${cobranca.situacao === "paga"
                                        ? `<button class="btn-small ghost" onclick="alterarSituacao(${cobranca.id}, 'pendente')">Desfazer</button>`
                                        : `<button class="btn-small" onclick="alterarSituacao(${cobranca.id}, 'paga')">Marcar como paga</button>`}
                                </td>
                            ` : ""}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}


/* ----- ALUNO ----- */

async function carregarCobrancasDoAluno() {

    const historico = document.getElementById("historico-cobrancas");

    let linhas;

    try {

        linhas = await api("/api/cobrancas/minhas");

    } catch (erro) {

        historico.innerHTML = `<p class="erro">${escaparHtml(erro.message)}</p>`;

        return;
    }


    const valor = document.getElementById("mensalidade-valor");

    const mes = document.getElementById("mensalidade-mes");

    const status = document.getElementById("mensalidade-status");

    const atual = linhas[0];


    if (atual) {

        valor.textContent = formatarCentavos(atual.valor_centavos);

        mes.textContent = formatarMes(atual.mes);

        status.textContent = atual.situacao === "paga" ? "QUITADA" : situacaoTexto[atual.situacao];

        status.classList.toggle("pendente", atual.situacao !== "paga");

    } else {

        valor.textContent = "—";

        mes.textContent = "Nenhuma mensalidade lançada";

        status.textContent = "";
    }


    historico.innerHTML = tabelaCobrancas(linhas, false);
}


/* ----- GESTÃO ----- */

async function carregarCobrancasDaGestao(mesEscolhido) {

    const seletor = document.getElementById("mes-cobrancas");

    const erro = document.getElementById("erro-cobrancas");

    erro.textContent = "";


    try {

        if (!mesEscolhido) {

            const meses = await api("/api/cobrancas/meses");

            seletor.innerHTML = meses
                .map(mes => `<option value="${mes}">${formatarMes(mes)}</option>`)
                .join("");

            mesEscolhido = meses[0];
        }

        const linhas = mesEscolhido
            ? await api(`/api/cobrancas?mes=${encodeURIComponent(mesEscolhido)}`)
            : [];

        renderizarCobrancasDaGestao(linhas);

    } catch (falha) {

        erro.textContent = falha.message;

    }
}


function renderizarCobrancasDaGestao(linhas) {

    const contar = situacao =>
        linhas.filter(cobranca => cobranca.situacao === situacao);

    const soma = lista =>
        lista.reduce((total, cobranca) => total + cobranca.valor_centavos, 0);

    const recebido = soma(contar("paga"));

    const aReceber = soma(linhas.filter(cobranca => cobranca.situacao !== "paga"));

    document.getElementById("resumo-cobrancas").innerHTML = `
        <div class="stat-box"><small>RECEBIDO</small><strong>${formatarCentavos(recebido)}</strong></div>
        <div class="stat-box"><small>A RECEBER</small><strong>${formatarCentavos(aReceber)}</strong></div>
        <div class="stat-box"><small>EM DIA</small><strong>${contar("paga").length}</strong></div>
        <div class="stat-box"><small>PENDENTES</small><strong>${contar("pendente").length}</strong></div>
        <div class="stat-box alert"><small>ATRASADAS</small><strong>${contar("atrasada").length}</strong></div>
    `;

    document.getElementById("tabela-cobrancas").innerHTML =
        tabelaCobrancas(linhas, true);
}


async function alterarSituacao(id, situacao) {

    try {

        await api(`/api/cobrancas/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ situacao })
        });

        carregarCobrancasDaGestao(document.getElementById("mes-cobrancas").value);

    } catch (falha) {

        document.getElementById("erro-cobrancas").textContent = falha.message;

    }
}


/* ==========================================
   APROVAÇÃO DE PROFESSORES
========================================== */

async function carregarPendentes() {

    const lista = document.getElementById("lista-pendentes");

    const erro = document.getElementById("erro-pendentes");

    erro.textContent = "";


    let pendentes;

    try {

        pendentes = await api("/api/professores/pendentes");

    } catch (falha) {

        erro.textContent = falha.message;

        return;
    }


    document.getElementById("total-pendentes").textContent =
        String(pendentes.length).padStart(2, "0");

    lista.innerHTML = pendentes.length === 0
        ? `<p class="empty">Nenhum cadastro aguardando aprovação.</p>`
        : pendentes.map(professor => `
            <div class="vehicle-row">
                <div class="student-avatar">${escaparHtml(professor.nome[0])}</div>
                <div>
                    <strong>${escaparHtml(professor.nome)}</strong>
                    <span>
                        Turno da ${turnos[professor.turno]?.nome.toLowerCase() || "—"}
                        · pediu em ${formatarData(professor.criado_em)}
                    </span>
                </div>
                <button class="btn-small" onclick="decidirProfessor(${professor.id}, true)">Aprovar</button>
                <button class="btn-small ghost" onclick="decidirProfessor(${professor.id}, false)">Recusar</button>
            </div>
        `).join("");
}


async function decidirProfessor(id, aprovar) {

    if (!aprovar && !confirm("Recusar e apagar este cadastro?")) {
        return;
    }

    try {

        await api(
            aprovar ? `/api/professores/${id}/aprovar` : `/api/professores/${id}`,
            { method: aprovar ? "POST" : "DELETE" }
        );

    } catch (falha) {

        document.getElementById("erro-pendentes").textContent = falha.message;

    }

    carregarPendentes();
}


/* ==========================================
   ESTACIONAMENTO
========================================== */

function renderizarEstacionamento() {

    const ocupadas = estacionamento.veiculos.length;

    const totalEntradas = Object.values(estacionamento.fluxo)
        .reduce((total, valor) => total + valor, 0);

    const saidas = estacionamento.registros
        .filter(registro => registro.tipo === "saida").length;

    document.getElementById("resumo-estacionamento").innerHTML = `
        <div class="stat-box"><small>VAGAS OCUPADAS</small><strong>${ocupadas} / ${estacionamento.vagas}</strong></div>
        <div class="stat-box"><small>VAGAS LIVRES</small><strong>${estacionamento.vagas - ocupadas}</strong></div>
        <div class="stat-box"><small>ENTRADAS HOJE</small><strong>${totalEntradas}</strong></div>
        <div class="stat-box"><small>SAÍDAS REGISTRADAS</small><strong>${saidas}</strong></div>
    `;


    const lista = document.getElementById("lista-veiculos");

    lista.innerHTML = ocupadas === 0
        ? `<p class="empty">Nenhum veículo no estacionamento.</p>`
        : estacionamento.veiculos.map(veiculo => `
            <div class="vehicle-row">
                <span class="plate">${escaparHtml(veiculo.placa)}</span>
                <div>
                    <strong>${escaparHtml(veiculo.cliente)}</strong>
                    <span>Entrou às ${veiculo.entrada}</span>
                </div>
                <button class="btn-small ghost" onclick="registrarSaida('${veiculo.placa}')">Saída</button>
            </div>
        `).join("");


    const maior = Math.max(...Object.values(estacionamento.fluxo), 1);

    document.getElementById("fluxo-estacionamento").innerHTML =
        Object.keys(estacionamento.fluxo).map(hora => {

            const valor = estacionamento.fluxo[hora];

            return `
                <div class="bar" title="${hora}h: ${valor} entradas">
                    <em>${valor}</em>
                    <span style="height: ${(valor / maior) * 100}%"></span>
                    <small>${hora}</small>
                </div>
            `;

        }).join("");


    document.getElementById("registros-estacionamento").innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Hora</th><th>Movimento</th><th>Placa</th><th>Cliente</th></tr>
                </thead>
                <tbody>
                    ${estacionamento.registros.slice(0, 8).map(registro => `
                        <tr>
                            <td>${registro.hora}</td>
                            <td>
                                <span class="status-tag ${registro.tipo === "entrada" ? "paga" : "pendente"}">
                                    ${registro.tipo === "entrada" ? "ENTRADA" : "SAÍDA"}
                                </span>
                            </td>
                            <td>${escaparHtml(registro.placa)}</td>
                            <td>${escaparHtml(registro.cliente)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}


function registrarEntrada(event) {

    event.preventDefault();

    const campoPlaca = document.getElementById("placa");

    const campoCliente = document.getElementById("cliente-placa");

    const erro = document.getElementById("erro-estacionamento");

    const placa = campoPlaca.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    const cliente = campoCliente.value.trim().toUpperCase();


    if (placa.length < 7) {
        erro.textContent = "Placa inválida. Use o formato ABC1D23.";
        return;
    }

    if (estacionamento.veiculos.some(veiculo => veiculo.placa === placa)) {
        erro.textContent = "Esse veículo já está no estacionamento.";
        return;
    }

    if (estacionamento.veiculos.length >= estacionamento.vagas) {
        erro.textContent = "Estacionamento lotado.";
        return;
    }


    erro.textContent = "";

    const hora = horaAtual();

    estacionamento.veiculos.push({ placa, cliente, entrada: hora });

    estacionamento.registros.unshift({ tipo: "entrada", placa, cliente, hora });

    const horaCheia = new Date().getHours();

    if (horaCheia in estacionamento.fluxo) {
        estacionamento.fluxo[horaCheia]++;
    }

    campoPlaca.value = "";

    campoCliente.value = "";

    renderizarEstacionamento();
}


function registrarSaida(placa) {

    const indice = estacionamento.veiculos
        .findIndex(veiculo => veiculo.placa === placa);

    if (indice === -1) {
        return;
    }

    const [veiculo] = estacionamento.veiculos.splice(indice, 1);

    estacionamento.registros.unshift({
        tipo: "saida",
        placa: veiculo.placa,
        cliente: veiculo.cliente,
        hora: horaAtual()
    });

    renderizarEstacionamento();
}


/* ==========================================
   INÍCIO
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderizarEquipe();
        renderizarZumba();
        renderizarEstacionamento();

        carregarAvisos();

        mostrarPagina("home");

        restaurarSessao();

    }
);
