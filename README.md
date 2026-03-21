# <img src="icons/icon128.png" align="center" width="40"> Live Preview + Favorites

[![Version](https://img.shields.io/badge/version-4.0-blueviolet.svg)](#)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](#)
[![Platforms](https://img.shields.io/badge/platforms-Twitch%20%7C%20Kick-black.svg)](#)

Uma extensão poderosa para navegadores Chromium que une o melhor da **Twitch** e da **Kick**. Favorite seus streamers e visualize o que está acontecendo na live apenas passando o mouse, sem trocar de aba.

---

## 📸 Preview da Logo
<p align="center">
  <img src="https://seu-link-da-imagem-aqui.com/logo.png" width="300" alt="Twitch & Kick Hybrid Logo">
</p>

---

## ✨ Funcionalidades

* **⚡ Live Hover Preview:** Passe o mouse sobre o link de um streamer e veja um preview em tempo real.
* **⭐ Sistema de Favoritos:** Salve seus canais favoritos para acesso rápido no popup.
* **🔄 Dual Platform:** Integração nativa com as APIs da Twitch e da Kick simultaneamente.
* **🎨 UI Minimalista:** Design limpo que não interfere na navegação original.

---

## 🛠️ Tecnologias Utilizadas

* **JavaScript (ES6+):** Lógica principal e manipulação de DOM.
* **Chrome Extension API (V3):** Padrão mais moderno e seguro para extensões.
* **Decapi.me & Unavatar.io:** Consumo de metadados e avatares.
* **CSS3:** Estilização dos tooltips e da interface lateral.

---

## 🚀 Como Instalar (Modo Desenvolvedor)

1. Faça o **Download** ou **Clone** deste repositório.
2. No seu navegador (Chrome, Edge, Brave), acesse: `chrome://extensions/`.
3. Ative o **"Modo do desenvolvedor"** no canto superior direito.
4. Clique em **"Carregar sem compactação"** (Load unpacked).
5. Selecione a pasta onde os arquivos da extensão estão salvos.

---

## 📂 Estrutura do Projeto

| Arquivo | Descrição |
| :--- | :--- |
| `manifest.json` | Configurações, permissões e metadados. |
| `content.js` | Script que roda dentro da Twitch/Kick. |
| `popup.html` | Interface que aparece ao clicar no ícone. |
| `icons/` | Pasta contendo as logos em diferentes tamanhos. |

---

## 🤝 Contribuição

Sinta-se à vontade para abrir uma **Issue** ou enviar um **Pull Request** para melhorias na velocidade do preview ou novas funcionalidades!

---
<p align="center">
  Desenvolvido por wiskton
</p>