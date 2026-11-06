"use strict"

// Chave do localStorage e nomes exibidos na tela
const CHAVE_POSTS = "reportaki_posts"
const NOMES_CATEGORIAS = {"lixo": "Lixo", "buraco": "Buraco", "iluminacao": "Iluminação"}
const NOMES_STATUS = {"nao-iniciado": "Não iniciado", "iniciado": "Iniciado", "finalizado": "Finalizado"}

// --- Funções Utilitárias ---

// Lê as publicações salvas (lista vazia se der erro)
function lerPostsSalvos() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_POSTS) || "[]")
        return Array.isArray(dados) ? dados : []
    }
    catch (erro) {
        console.warn("Não foi possível ler as publicações salvas.", erro)
        return []
    }
}

// Converte a data salva para "dd/mm/aaaa | hh:mm"
function formatarDataHora(valor) {
    const data = new Date(valor)

    if (!valor || isNaN(data.getTime())) {
        return ""
    }

    const dia = data.toLocaleDateString("pt-br")
    const hora = data.toLocaleTimeString("pt-br", { hour: "2-digit", minute: "2-digit" })
    return `${dia} | ${hora}`
}

// Cria um elemento com classe e texto opcionais
function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag)
    
    if (classe) {
        elemento.className = classe
    }

    if (texto != undefined) {
        elemento.textContent = texto
    }

    return elemento
}

// --- Lógica Principal do Feed ---

// Desenha no feed as publicações salvas
function adicionarPostsSalvos() {
    const container = document.getElementById("feedPosts")

    if (!container) {
        return
    }

    container.querySelectorAll("[data-post-id]").forEach((post) => post.remove())
    const fragmento = document.createDocumentFragment()

    lerPostsSalvos().forEach((post) => {
        const artigo = criarElemento("article", "feed-post")
        artigo.dataset.postId = post.id
        artigo.dataset.categoria = post.categoria
        artigo.dataset.status = post.status
        artigo.dataset.cidade = post.cidade
        const foto = criarElemento("img", "post-photo")
        foto.src = post.imagem
        foto.alt = `Foto do local da ocorrência: ${post.titulo}`
        foto.loading = "lazy"
        const info = criarElemento("div", "feed-post-info")
        const meta = criarElemento("div", "post-meta")

        meta.append(
            criarElemento("span", `feed-tag tag-${post.categoria}`, NOMES_CATEGORIAS[post.categoria] || post.categoria),
            criarElemento("span", `feed-status status-${post.status}`, NOMES_STATUS[post.status] || post.status)
        )
        
        info.append(
            meta,
            criarElemento("h2", "", post.titulo),
            criarElemento("p", "", post.descricao)
        )
        
        const rodape = criarElemento("div", "post-footer")
        const enderecoCompleto = [post.cidade, post.endereco].filter(Boolean).join(", ")
        
        const dataHora = formatarDataHora(post.data)
        const textoLocal = enderecoCompleto || post.cidade
        rodape.append(criarElemento("span", "", dataHora ? `${textoLocal} | ${dataHora}` : textoLocal))
        
        // Só prefeituras veem o botão, e só se o status NÃO for finalizado
        if (ehPrefeitura() && post.status != "finalizado") {
            const btnStatus = criarElemento("button", "button btn-alterar-status", "Alterar status")
            btnStatus.type = "button"
            rodape.append(btnStatus)
        }

        info.append(rodape)
        artigo.append(foto, info)
        fragmento.append(artigo)
    })
    
    container.prepend(fragmento)
}

// Define a cidade do feed
function cidadeDoFeed() {
    if (ehPrefeitura()) {
        return usuarioAtual().municipio
    }

    return new URLSearchParams(window.location.search).get("cidade")
}

// Mostra só os posts que batem com categoria, status e cidade
function filtrarFeed() {
    const container = document.getElementById("feedPosts")
    const filtroCategoria = document.getElementById("feedCategoria")
    const mensagem = document.getElementById("feedSemResultados")
    
    if (!container || !filtroCategoria || !mensagem) {
        return
    }

    const abaAtiva = document.querySelector(".feed-tab.ativa")
    const statusSelecionado = abaAtiva ? abaAtiva.dataset.status : "todas"
    const categoriaSelecionada = filtroCategoria.value
    const cidadeUrl = cidadeDoFeed()
    const posts = container.querySelectorAll(".feed-post")
    let encontrados = 0

    posts.forEach((post) => {
        const categoriaCorreta = categoriaSelecionada == "todas" || categoriaSelecionada == post.dataset.categoria
        const statusCorreto = statusSelecionado == "todas" || statusSelecionado == post.dataset.status
        const cidadeCorreta = !cidadeUrl || (post.dataset.cidade || "").toLocaleLowerCase("pt-br") == cidadeUrl.toLocaleLowerCase("pt-br")
        const mostrar = categoriaCorreta && statusCorreto && cidadeCorreta
        post.hidden = !mostrar

        if (mostrar) {
            encontrados++
        }
    })

    mensagem.hidden = encontrados != 0
    const subtitulo = document.getElementById("feedSubtitle")

    if (subtitulo) {
        subtitulo.textContent = cidadeUrl ? `Acompanhe os problemas de ${cidadeUrl}.` : "Acompanhe os problemas das cidades."
    }
}

// Marca a aba de status ativa e reaplica o filtro
function selecionarStatus(status, botao) {
    document.querySelectorAll(".feed-tab").forEach((aba) => {
        const selecionada = aba == botao
        aba.classList.toggle("ativa", selecionada)
        aba.setAttribute("aria-pressed", String(selecionada))
    })

    filtrarFeed()
}

// --- FUNÇÃO DE ALTERAR STATUS CORRIGIDA ---

// Avança o status: não iniciado -> iniciado -> finalizado
function alterarStatus(evento) {
    // Só prefeituras podem alterar o status
    if (!ehPrefeitura()) {
        return
    }

    const botao = evento.target 
    const postElement = botao.closest(".feed-post")
    
    if (!postElement) {
        return
    }

    const statusAtual = postElement.dataset.status

    if (statusAtual == "finalizado") {
        return
    }

    let novoStatus = ""

    if (statusAtual == "nao-iniciado") {
        novoStatus = "iniciado"
    }
    else if (statusAtual == "iniciado") {
        novoStatus = "finalizado"
    }

    // 1. Atualiza os dados no HTML
    postElement.dataset.status = novoStatus

    // 2. Atualiza a etiqueta visual
    const tagStatus = postElement.querySelector(".feed-status")

    if (tagStatus) {
        tagStatus.className = `feed-status status-${novoStatus}`
        tagStatus.textContent = NOMES_STATUS[novoStatus]
    }

    // 3. Se o post acabou de ser finalizado, esconde o botão
    if (novoStatus == "finalizado") {
        botao.style.display = "none"
    }

    // 4. Atualiza no localStorage
    const postId = postElement.dataset.postId
    if (postId) {
        const posts = lerPostsSalvos()
        const index = posts.findIndex(p => p.id == postId)
        if (index != -1) {
            posts[index].status = novoStatus
            localStorage.setItem(CHAVE_POSTS, JSON.stringify(posts))
        }
    }

    // 5. Reaplica os filtros
    filtrarFeed()
}

// --- Inicialização ---

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("feedPosts")) {
        adicionarPostsSalvos()
        filtrarFeed()

        // Remove o botão dos posts estáticos para quem não é prefeitura
        if (!ehPrefeitura()) {
            document.querySelectorAll(".btn-alterar-status").forEach((btn) => btn.remove())
        }

        // Esconde o botão dos posts estáticos (HTML) que já estão finalizados
        document.querySelectorAll('.feed-post').forEach(post => {
            if (post.dataset.status == 'finalizado') {
                const btn = post.querySelector('.btn-alterar-status')
                if (btn) {
                    btn.style.display = 'none'
                }
            }
        })

        document.querySelectorAll(".feed-tab").forEach((botao) => {
            botao.addEventListener("click", () =>
                selecionarStatus(botao.dataset.status, botao)
            )
        })
        
        const filtroCategoria = document.getElementById("feedCategoria")
        if (filtroCategoria) {
            filtroCategoria.addEventListener("change", filtrarFeed)
        }

        // Ouvinte de cliques no container do feed
        document.getElementById("feedPosts").addEventListener("click", (evento) => {
            if (evento.target.classList.contains("btn-alterar-status")) {
                alterarStatus(evento)
            }
        })

        const params = new URLSearchParams(window.location.search)
        if (params.get("publicado") == "1") {
            const aviso = criarElemento(
                "p",
                "success-banner",
                "Publicação criada com sucesso! Ela aparece no início do Feed."
            )
            document.querySelector(".feed-page").prepend(aviso)
            history.replaceState({}, "", "feed.html" + (params.has("cidade") ? `?cidade=${encodeURIComponent(params.get("cidade"))}` : ""))
        }
    }
})