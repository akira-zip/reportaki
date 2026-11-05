"use strict"

// Filtra as cidades da lista conforme o texto digitado
function pesquisar() {
    const campo = document.querySelector("#pesquisa")
    const mensagem = document.querySelector("#buscaSemResultados")
    const termo = (campo ? campo.value : "").trim().toLocaleLowerCase("pt-br")
    const itens = document.querySelectorAll("#resultados .item")
    let encontrados = 0

    itens.forEach((item) => {
        const mostrar = item.dataset.cidade.toLocaleLowerCase("pt-br").includes(termo)
        item.hidden = !mostrar

        if (mostrar) {
            encontrados++
        }
    })

    // Só mostra o aviso quando nada é encontrado
    if (mensagem) {
        mensagem.hidden = encontrados > 0
    }
}

function mostrarCidades() {
    const resultados = document.querySelector("#resultados")
    
    MUNICIPIOS.forEach((municipio) => {
        let cartao = document.createElement("button")
        cartao.className = "city-card item"
        cartao.dataset.cidade = municipio
        cartao.innerHTML = `
            <span class="city-symbol"></span>

            <span class="city-nome"></span>

            <span class="city-arrow">↗</span>
        `
        cartao.querySelector(".city-symbol").textContent = municipio.slice(0, 2).toUpperCase()
        cartao.querySelector(".city-nome").textContent = municipio
        resultados.append(cartao)
    })
}

// Liga os eventos de busca e o clique nas cidades
document.addEventListener("DOMContentLoaded", () => {
    mostrarCidades()
    const campoPesquisa = document.querySelector("#pesquisa")

    if (campoPesquisa) {
        campoPesquisa.addEventListener("input", pesquisar)
    }

    document.querySelectorAll("#resultados .item").forEach((item) => {
        // Abre o feed filtrado pela cidade escolhida
        item.addEventListener("click", () => {
            const cidade = item.dataset.cidade
            window.location.href = `feed.html?cidade=${encodeURIComponent(cidade)}`
        })
    })
})