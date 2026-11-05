"use strict"

// Filtra as cidades da lista conforme o texto digitado
function pesquisar() {
    const campo = document.getElementById("pesquisa")
    const mensagem = document.getElementById("buscaSemResultados")
    const termo = (campo ? campo.value : "").trim().toLocaleLowerCase("pt-BR")
    const itens = document.querySelectorAll("#resultados .item")
    let encontrados = 0

    itens.forEach((item) => {
        const mostrar = item.dataset.cidade
            .toLocaleLowerCase("pt-BR")
            .includes(termo)
        item.hidden = !mostrar
        if (mostrar) encontrados++
    })

    // Só mostra o aviso quando nada é encontrado
    if (mensagem) mensagem.hidden = encontrados > 0
}

// Liga os eventos de busca e o clique nas cidades
document.addEventListener("DOMContentLoaded", () => {
    const botaoBuscar = document.getElementById("btnBuscar")
    if (botaoBuscar) botaoBuscar.addEventListener("click", pesquisar)

    const campoPesquisa = document.getElementById("pesquisa")
    if (campoPesquisa) campoPesquisa.addEventListener("input", pesquisar)

    document.querySelectorAll("#resultados .item").forEach((item) => {
        // Abre o feed filtrado pela cidade escolhida
        item.addEventListener("click", () => {
            const cidade = item.dataset.cidade
            window.location.href = `feed.html?cidade=${encodeURIComponent(cidade)}`
        })
    })
})