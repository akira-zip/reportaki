"use strict"

// Chave do localStorage e nomes exibidos na tela
const CHAVE_POSTS = "reportaki_posts"
const NOMES_CATEGORIAS = {
    lixo: "Lixo",
    buraco: "Buraco",
    iluminacao: "Iluminação",
}
const NOMES_STATUS = {
    "nao-iniciado": "Não iniciado",
    iniciado: "Iniciado",
    finalizado: "Finalizado",
}

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

// Valida o formulário e salva a nova publicação
async function salvarPost(evento) {
    evento.preventDefault()
    const form = evento.currentTarget
    const mensagem = document.getElementById("formMensagem")

    // Só cidadãos podem publicar
    if (!ehCidadao()) {
        mensagem.textContent = "Apenas contas de cidadão podem publicar ocorrências."
        mensagem.hidden = false
        return
    }

    const cidade = form.elements.cidade.value.trim()
    const endereco = form.elements.endereco.value.trim()
    const titulo = form.elements.titulo.value.trim()
    const categoria = form.elements.categoria.value
    const descricao = form.elements.descricao.value.trim()
    const arquivoImagem = form.elements.imagem.files[0]
    const botaoEnviar = form.querySelector('button[type="submit"]')

    if (!cidade || !endereco || !titulo || !categoria || !descricao) {
        mensagem.textContent = "Preencha todos os campos obrigatórios antes de publicar."
        mensagem.hidden = false
        return
    }

    mensagem.hidden = true
    botaoEnviar.disabled = true
    botaoEnviar.textContent = "Publicando..."

    try {
        const imagem = await otimizarImagem(arquivoImagem)
        const post = {
            id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            cidade,
            endereco,
            titulo,
            categoria,
            descricao,
            imagem,
            status: "nao-iniciado",
            // Data e hora do envio, geradas automaticamente
            data: new Date().toISOString()
        }
        const posts = lerPostsSalvos()
        posts.unshift(post)
        localStorage.setItem(CHAVE_POSTS, JSON.stringify(posts))
        window.location.href = "feed.html?publicado=1"
    } catch (erro) {
        mensagem.textContent = erro.message || "Não foi possível salvar neste navegador. Tente usar uma imagem menor ou verifique o armazenamento disponível."
        mensagem.hidden = false
        console.error("Não foi possível publicar a ocorrência.", erro)
        botaoEnviar.disabled = false
        botaoEnviar.textContent = "Publicar ocorrência"
    }
}

// Valida a imagem e reduz para até 1400 px em JPEG
function otimizarImagem(arquivo) {
    if (!arquivo) {
        return Promise.resolve("")
    }

    if (!arquivo.type.startsWith("image/")) {
        return Promise.reject(new Error("Selecione um arquivo de imagem válido."))
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        return Promise.reject(new Error("A imagem deve ter no máximo 10 MB."))
    }

    return new Promise((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."))
        leitor.onload = () => {
            const imagem = new Image()
            imagem.onerror = () => reject(new Error("O arquivo selecionado não é uma imagem válida."))
            imagem.onload = () => {
                const limite = 1400
                const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height))
                const largura = Math.max(1, Math.round(imagem.width * escala))
                const altura = Math.max(1, Math.round(imagem.height * escala))
                const canvas = document.createElement("canvas")
                canvas.width = largura
                canvas.height = altura
                const contexto = canvas.getContext("2d")

                if (!contexto) {
                    reject(new Error("Não foi possível processar a imagem."))
                    return
                }

                contexto.fillStyle = "#ffffff"
                contexto.fillRect(0, 0, largura, altura)
                contexto.drawImage(imagem, 0, 0, largura, altura)
                resolve(canvas.toDataURL("image/jpeg", 0.82))
            }
            imagem.src = leitor.result
        }
        leitor.readAsDataURL(arquivo)
    })
}

// Converte a data salva para "dd/mm/aaaa | hh:mm"
function formatarDataHora(valor) {
    const data = new Date(valor)

    if (!valor || isNaN(data.getTime())) {
        return ""
    }
    
    const dia = data.toLocaleDateString("pt-BR")
    const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
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

// Desenha no feed as publicações salvas
function adicionarPostsSalvos() {
    const container = document.getElementById("feedPosts")

    if (!container) {
        return
    }

    // Limpa somente posts criados pelo usuário antes de renderizá-los de novo.
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
            criarElemento(
                "span",
                `feed-tag tag-${post.categoria}`, NOMES_CATEGORIAS[post.categoria] || post.categoria,
            ),
            criarElemento(
                "span",
                `feed-status status-${post.status}`, NOMES_STATUS[post.status] || post.status,
            )
        )
        info.append(
            meta,
            criarElemento("h2", "", post.titulo),
            criarElemento("p", "", post.descricao),
        )

        const rodape = criarElemento("div", "post-footer")
        const enderecoCompleto = [post.cidade, post.endereco].filter(Boolean).join(", ")
        const dataHora = formatarDataHora(post.data)
        const textoLocal = enderecoCompleto || post.cidade
        rodape.append(criarElemento("span", "", dataHora ? `${textoLocal} | ${dataHora}` : textoLocal))
        info.append(rodape)
        artigo.append(foto, info)
        fragmento.append(artigo)
    })
    
    container.prepend(fragmento)
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
    const cidadeUrl = new URLSearchParams(window.location.search).get("cidade")
    const posts = container.querySelectorAll(".feed-post")
    let encontrados = 0
    posts.forEach((post) => {
        const categoriaCorreta =
            categoriaSelecionada == "todas" ||
            post.dataset.categoria == categoriaSelecionada
        const statusCorreto =
            statusSelecionado == "todas" ||
            post.dataset.status == statusSelecionado
        const cidadeCorreta =
            !cidadeUrl ||
            (post.dataset.cidade || "").toLocaleLowerCase("pt-BR") ==
            cidadeUrl.toLocaleLowerCase("pt-BR")
        const mostrar = categoriaCorreta && statusCorreto && cidadeCorreta
        post.hidden = !mostrar

        if (mostrar) {
            encontrados++
        }
    })

    mensagem.hidden = encontrados != 0
    const subtitulo = document.getElementById("feedSubtitle")

    if (subtitulo) {
        subtitulo.textContent = cidadeUrl
            ? `Acompanhe os problemas de ${cidadeUrl}.`
            : "Acompanhe os problemas de Jundiaí e de outras cidades."
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

// Inicialização: formulário de publicação e feed
document.addEventListener("DOMContentLoaded", () => {
    // --- Bloco 1: dropdown de municípios (opcional; não derruba o resto se falhar) ---
    try {
        if (typeof carregarMunicipios == "function") {
            carregarMunicipios()
        }
    }
    catch (erro) {
        console.warn("Falha ao carregar municípios:", erro)
    }

    // --- Bloco 2: formulário de publicação (post.html) ---
    const form = document.getElementById("formPost")

    if (form) {
        form.addEventListener("submit", salvarPost)
    }

    const campoImagem = document.getElementById("postImagem")
    const previaImagem = document.getElementById("imagemPreview")
    let urlImagemPrevia = null

    if (campoImagem && previaImagem) {
        campoImagem.addEventListener("change", () => {
            if (urlImagemPrevia) {
                URL.revokeObjectURL(urlImagemPrevia)
            }

            const arquivo = campoImagem.files[0]
            
            if (!arquivo) {
                previaImagem.hidden = true
                previaImagem.removeAttribute("src")
                urlImagemPrevia = null
                return
            }
            
            urlImagemPrevia = URL.createObjectURL(arquivo)
            previaImagem.src = urlImagemPrevia
            previaImagem.hidden = false
        })
    }

    // --- Bloco 3: feed (feed.html) ---
    document.querySelectorAll(".feed-tab").forEach((botao) => {
        botao.addEventListener("click", () =>
            selecionarStatus(botao.dataset.status, botao),
        )
    })
    const filtroCategoria = document.getElementById("feedCategoria")

    if (filtroCategoria) {
        filtroCategoria.addEventListener("change", filtrarFeed)
    }

    if (document.getElementById("feedPosts")) {
        adicionarPostsSalvos()
        filtrarFeed()
        const params = new URLSearchParams(window.location.search)

        if (params.get("publicado") == "1") {
            const aviso = criarElemento(
                "p",
                "success-banner",
                "Publicação criada com sucesso! Ela aparece no início do Feed.",
            )
            document.querySelector(".feed-page").prepend(aviso)
            history.replaceState({}, "", "feed.html" + (params.has("cidade") ? `?cidade=${encodeURIComponent(params.get("cidade"))}` : ""))
        }
    }
})