"use strict"

// Chaves do localStorage para as contas e para a sessão ativa
const CHAVE_USUARIOS = "reportaki_usuarios"
const CHAVE_SESSAO = "reportaki_sessao"

// Lê as contas cadastradas (lista vazia se der erro)
function lerUsuarios() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_USUARIOS) || "[]")
        return Array.isArray(dados) ? dados : []
    }
    catch (erro) {
        console.warn("Não foi possível ler as contas salvas.", erro)
        return []
    }
}

// Gera um identificador aleatório
function gerarId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Gera o hash SHA-256 da senha com um sal (texto puro se o navegador não suportar)
async function gerarHash(senha, sal) {
    if (!(window.crypto && crypto.subtle)) {
        return "texto:" + senha
    }

    const bytes = new TextEncoder().encode(sal + senha)
    const resumo = await crypto.subtle.digest("SHA-256", bytes)
    return Array.from(new Uint8Array(resumo)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Monta um erro de cadastro apontando qual campo tem problema
function erroCampo(mensagem, campo) {
    const erro = new Error(mensagem)
    erro.campo = campo
    return erro
}

// Cria e salva uma conta (cidadão ou prefeitura); recusa e-mail, CPF ou CNPJ repetidos
async function cadastrarUsuario(dados) {
    const usuarios = lerUsuarios()
    const email = dados.email.trim().toLowerCase()

    if (usuarios.some((u) => u.email == email)) {
        throw erroCampo("Já existe uma conta com este e-mail.", "email")
    }

    if (dados.tipo == "cidadao" && usuarios.some((u) => u.cpf == dados.cpf)) {
        throw erroCampo("Já existe uma conta com este CPF.", "cpf")
    }
    
    if (dados.tipo == "prefeitura" && usuarios.some((u) => u.cnpj == dados.cnpj)) {
        throw erroCampo("Já existe uma conta com este CNPJ.", "cnpj")
    }

    const sal = gerarId()
    const usuario = {
        id: gerarId(),
        tipo: dados.tipo,
        email,
        sal,
        senhaHash: await gerarHash(dados.senha, sal),
        criadoEm: new Date().toISOString(),
    }

    if (dados.tipo == "cidadao") {
        usuario.cpf = dados.cpf
        usuario.pseudonimo = dados.pseudonimo
    }
    else {
        usuario.cnpj = dados.cnpj
        usuario.municipio = dados.municipio
    }

    usuarios.push(usuario)
    
    try {
        localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios))
    }
    catch (erro) {
        console.error("Não foi possível salvar a conta.", erro)
        throw new Error("Não foi possível salvar a conta neste navegador.")
    }
    
    return usuario
}

// Confere e-mail e senha; devolve a conta ou null
async function autenticar(email, senha) {
    const usuario = lerUsuarios().find((u) => u.email == email.trim().toLowerCase())
    
    if (!usuario) {
        return null
    }
    
    const hash = await gerarHash(senha, usuario.sal)
    return hash == usuario.senhaHash ? usuario : null
}

// Marca a conta como logada neste navegador
function iniciarSessao(usuario) {
    localStorage.setItem(CHAVE_SESSAO, usuario.id)
}

// Encerra a sessão e volta para a tela de acesso
function encerrarSessao() {
    localStorage.removeItem(CHAVE_SESSAO)
    window.location.href = "../index.html"
}

// Conta logada no momento (ou null)
function usuarioAtual() {
    const id = localStorage.getItem(CHAVE_SESSAO)
    return lerUsuarios().find((u) => u.id == id) || null
}

// Cidadão pode publicar ocorrências
function ehCidadao() {
    const usuario = usuarioAtual()
    return !!usuario && usuario.tipo == "cidadao"
}

// Prefeitura pode alterar o status das ocorrências
function ehPrefeitura() {
    const usuario = usuarioAtual()
    return !!usuario && usuario.tipo == "prefeitura"
}

// Página que abre logo após entrar ou cadastrar (a partir da raiz do projeto)
function destinoInicial(usuario) {
    return usuario.tipo == "prefeitura" ? "./pages/feed.html" : "./pages/home.html"
}

// Prefeitura não tem tela inicial: logo vira "Feed" e a nav só mantém Feed e Perfil
function ajustarNavPrefeitura() {
    const logo = document.querySelector(".site-header .brand")

    if (logo) {
        logo.setAttribute("href", "feed.html")
    }

    document.querySelectorAll(".site-nav a").forEach((link) => {
        const destino = link.getAttribute("href")

        if (destino != "feed.html" && destino != "perfil.html") {
            link.remove()
        }
    })
}

// Preenche a página de perfil com os dados da conta logada
function preencherPerfil(usuario) {
    const nome = document.getElementById("perfilNome")
    const email = document.getElementById("perfilEmail")
    const tipo = document.getElementById("perfilTipo")

    if (!nome || !email || !tipo) {
        return
    }

    nome.value = usuario.tipo == "cidadao" ? usuario.pseudonimo : `Prefeitura de ${usuario.municipio}`
    email.value = usuario.email
    tipo.value = usuario.tipo == "cidadao" ? "Cidadão" : "Prefeitura"
}

// Aplica as regras de acesso da página (data-exige) e esconde itens por perfil (data-somente)
document.addEventListener("DOMContentLoaded", () => {
    const usuario = usuarioAtual()
    const exige = document.body.dataset.exige

    if (exige == "login" && !usuario) {
        window.location.href = "../index.html"
        return
    }

    if (exige == "cidadao" && (!usuario || usuario.tipo != "cidadao")) {
        window.location.href = usuario ? "feed.html" : "../index.html"
        return
    }

    // Páginas marcadas com data-bloqueia não abrem para prefeitura
    if (usuario && usuario.tipo == "prefeitura") {
        if ((document.body.dataset.bloqueia || "").split(" ").includes("prefeitura")) {
            window.location.href = "feed.html"
            return
        }
        
        ajustarNavPrefeitura()
    }

    document.querySelectorAll("[data-somente]").forEach((el) => {
        el.hidden = !usuario || usuario.tipo != el.dataset.somente
    })

    if (usuario) {
        preencherPerfil(usuario)
    }

    const botaoSair = document.getElementById("btnSair")
    
    if (botaoSair) {
        botaoSair.addEventListener("click", encerrarSessao)
    }
})