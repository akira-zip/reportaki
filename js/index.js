"use strict"

// Abas e formulários da tela de acesso
const abas = document.querySelectorAll(".auth-tab")
const formEntrar = document.getElementById("painel-entrar")
const formCadastrar = document.getElementById("painel-cadastrar")
const paineis = { entrar: formEntrar, cadastrar: formCadastrar }

// Remove tudo que não for número
function somenteDigitos(valor) {
    return valor.replace(/\D/g, "")
}

// Formata como 000.000.000-00
function mascararCpf(valor) {
    const d = somenteDigitos(valor).slice(0, 11)
    return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2")
}

// Formata como 00.000.000/0000-00
function mascararCnpj(valor) {
    const d = somenteDigitos(valor).slice(0, 14)
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
}

// Valida o CPF pelos dígitos verificadores
function cpfValido(valor) {
    const d = somenteDigitos(valor)
    
    if (d.length != 11 || /^(\d)\1{10}$/.test(d))
        return false
    
    for (const tamanho of [9, 10]) {
        let soma = 0

        for (let i = 0; i < tamanho; i++) {
            soma += Number(d[i]) * (tamanho + 1 - i)
        }

        const digito = ((soma * 10) % 11) % 10

        if (digito != Number(d[tamanho])) {
            return false
        }
    }

    return true
}

// Valida o CNPJ pelos dígitos verificadores
function cnpjValido(valor) {
    const d = somenteDigitos(valor)

    if (d.length != 14 || /^(\d)\1{13}$/.test(d)) {
        return false
    }
    
    for (const tamanho of [12, 13]) {
        let soma = 0
        let peso = tamanho - 7

        for (let i = 0; i < tamanho; i++) {
            soma += Number(d[i]) * peso--

            if (peso < 2) {
                peso = 9
            }
        }
        
        const digito = soma % 11 < 2 ? 0 : 11 - (soma % 11)
        
        if (digito != Number(d[tamanho])) {
            return false
        }
    }

    return true
}

// Alterna entre as abas Entrar e Cadastrar
function mostrarPainel(nome, moverFoco) {
    abas.forEach((aba) => {
        const ativa = aba.dataset.painel == nome
        aba.setAttribute("aria-selected", String(ativa))
        aba.tabIndex = ativa ? 0 : -1
        if (ativa && moverFoco) aba.focus()
    })

    Object.entries(paineis).forEach(([chave, form]) => {
        form.hidden = chave != nome
    })

    history.replaceState(null, "", nome == "cadastrar" ? "#cadastrar" : "#entrar")
}

// Exibe a mensagem de erro e foca o campo com problema
function mostrarErro(form, mensagem, campo) {
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"))
    const caixa = form.querySelector(".form-message")
    caixa.textContent = mensagem
    caixa.hidden = false

    if (campo) {
        campo.setAttribute("aria-invalid", "true")
        campo.focus()
    }
}

// Esconde a mensagem e remove as marcações de erro
function limparErro(form) {
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"))
    form.querySelector(".form-message").hidden = true
}

// Mostra só os campos do tipo de conta escolhido
function atualizarTipoConta() {
    const tipo = formCadastrar.elements.tipo.value

    formCadastrar.querySelectorAll("[data-tipo]").forEach((campo) => {
        const ativo = campo.dataset.tipo == tipo
        campo.hidden = !ativo
        campo.querySelector("input").disabled = !ativo
    })
    
    limparErro(formCadastrar)
}

// Valida o formato do e-mail (e o domínio .gov.br, quando exigido)
function emailValido(valor, exigirGov = false) {
    const email = valor.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return false
    }

    if (!exigirGov) {
        return true
    }

    const dominio = email.split("@")[1]
    return dominio.endsWith(".gov.br")
}

// Troca de aba por clique ou pelas setas do teclado
abas.forEach((aba, indice) => {
    aba.addEventListener("click", () => mostrarPainel(aba.dataset.painel, false))

    aba.addEventListener("keydown", (evento) => {
        if (evento.key != "ArrowLeft" && evento.key != "ArrowRight")
            return
        
        const proxima = abas[(indice + 1) % abas.length]
        mostrarPainel(proxima.dataset.painel, true)
    })
})

/* Máscaras */
formCadastrar.elements.cpf.addEventListener("input", (e) => {
    e.target.value = mascararCpf(e.target.value)
})

formCadastrar.elements.cnpj.addEventListener("input", (e) => {
    e.target.value = mascararCnpj(e.target.value)
})

formCadastrar.querySelectorAll('input[name="tipo"]').forEach((opcao) => {
    opcao.addEventListener("change", atualizarTipoConta)
})

/* Entrar */
formEntrar.addEventListener("submit", async (evento) => {
    evento.preventDefault()
    const { email, senha } = formEntrar.elements
    limparErro(formEntrar)

    if (!emailValido(email.value.trim())) {
        return mostrarErro(formEntrar, "Informe um e-mail válido.", email)
    }

    if (!senha.value) {
        return mostrarErro(formEntrar, "Informe sua senha.", senha)
    }

    // Confere as credenciais nas contas salvas e abre a sessão
    const usuario = await autenticar(email.value, senha.value)

    if (!usuario) {
        return mostrarErro(formEntrar, "E-mail ou senha incorretos.", senha)
    }

    iniciarSessao(usuario)
    window.location.href = destinoInicial(usuario)
})

/* Criar conta */
formCadastrar.addEventListener("submit", async (evento) => {
    evento.preventDefault()
    const f = formCadastrar.elements
    const tipo = f.tipo.value
    limparErro(formCadastrar)

    // Valida os campos de cada tipo de conta
    if (tipo == "cidadao") {
        if (!cpfValido(f.cpf.value)) {
            return mostrarErro(formCadastrar, "Informe um CPF válido.", f.cpf)
        }

        if (!f.pseudonimo.value.trim()) {
            return mostrarErro(formCadastrar, "Escolha um pseudônimo.", f.pseudonimo)
        }
    }
    else {
        if (!cnpjValido(f.cnpj.value)) {
            return mostrarErro(formCadastrar, "Informe um CNPJ válido.", f.cnpj)
        }

        if (!f.municipio.value.trim()) {
            return mostrarErro(formCadastrar, "Informe o município.", f.municipio)
        }
    }

    if (!emailValido(f.email.value.trim())) {
        return mostrarErro(formCadastrar, "Informe um e-mail válido.", f.email)
    }

    // Prefeituras precisam usar e-mail institucional
    if (tipo == "prefeitura" && !emailValido(f.email.value.trim(), true)) {
        return mostrarErro(formCadastrar, "Prefeituras precisam usar um e-mail .gov.br.", f.email)
    }

    if (f.senha.value.length < 8) {
        return mostrarErro(formCadastrar, "A senha precisa ter pelo menos 8 caracteres.", f.senha)
    }

    if (f.senha.value != f.confirma.value) {
        return mostrarErro(formCadastrar, "As senhas não são iguais.", f.confirma)
    }


    // Salva a conta, abre a sessão e segue para a página inicial do perfil
    try {
        const usuario = await cadastrarUsuario({
            tipo,
            email: f.email.value,
            senha: f.senha.value,
            cpf: tipo == "cidadao" ? f.cpf.value : undefined,
            pseudonimo: tipo == "cidadao" ? f.pseudonimo.value.trim() : undefined,
            cnpj: tipo == "prefeitura" ? f.cnpj.value : undefined,
            municipio: tipo == "prefeitura" ? f.municipio.value.trim() : undefined,
        })
        
        iniciarSessao(usuario)
        window.location.href = destinoInicial(usuario)
    } catch (erro) {
        mostrarErro(formCadastrar, erro.message, erro.campo ? f[erro.campo] : null)
    }
})

/* Painel inicial conforme o link (#cadastrar) */
mostrarPainel(window.location.hash == "#cadastrar" ? "cadastrar" : "entrar", false)