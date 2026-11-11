# Cálculo Visual

Material de estudo interativo de **Cálculo Diferencial e Integral**, feito com HTML, CSS e JavaScript puro, sem dependências.

Cada tema traz a teoria resumida, gráficos que o estudante manipula com controles deslizantes, exercícios resolvidos passo a passo e exercícios propostos com correção automática.

## Temas

| Tema | Conteúdo |
| --- | --- |
| **1. Funções** | Conceito, domínio e imagem; funções constante, afim, linear, exponencial e logarítmica; explorador para traçar qualquer função. |
| **2. Limites** | Conceito e definição ε–δ; propriedades dos limites; casos (substituição direta, indeterminação 0/0, limites laterais, x → ∞, limite infinito); limites laterais e infinitos; continuidade e tipos de descontinuidade; explorador gráfico e tabela numérica. |
| **3. Derivadas** | Definição pelo limite; regras da constante, potência, múltiplo constante, soma e diferença e produto; explorador de reta tangente e secante. |
| **4. Integrais** | Integral definida e Teorema Fundamental do Cálculo; regras da constante, potência, soma/subtração, exponencial e trigonométrica; integral indefinida e definida, substituição, por partes, área entre curvas e acumulação; explorador de área sob a curva. |

## Recursos

- **Gráficos manipuláveis:** ao lado de cada tipo, caso ou regra há um gráfico com controles deslizantes. Ele mostra ao vivo a fórmula com os valores atuais e destaca os pontos, assíntotas, tangentes ou áreas importantes. O botão *Restaurar* volta aos valores iniciais.
- **Exploradores livres:** campos onde o estudante digita qualquer função para traçar o gráfico, estimar um limite, ver a tangente e a secante ou calcular a área sob a curva (pela regra de Simpson).
- **Exercícios resolvidos:** um para cada tipo, caso ou regra, com a solução passo a passo.
- **Exercícios propostos com correção automática:** o estudante escolhe os valores dos parâmetros e digita a resposta. Ao acertar, a solução e um gráfico ilustrativo aparecem.
- **Layout responsivo**, com tema escuro e menu adaptado para celular.

## Como usar

Não há instalação nem etapa de build. Basta abrir o arquivo `index.html` em um navegador moderno.

Também é possível publicar a pasta como site estático, por exemplo no GitHub Pages.

### Sintaxe das expressões

Nos exploradores, as funções são digitadas em texto:

- Operadores: `+ - * / ^` e parênteses. A multiplicação implícita também funciona (`2x`).
- Funções: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `ln`, `log`, `sqrt`, `cbrt`, `abs`, `exp`, `floor`, `ceil`, `round`, `sign`, `tanh`.
- Constantes: `pi` e `e`.

Exemplos: `x^2 - 4*x + 3`, `sin(x)/x`, `(x^2 - 9)/(x - 3)`, `2^x`, `ln(x)`.

## Estrutura

```
index.html        Página inicial com os quatro temas
funcoes.html      Tema 1 — Funções
limites.html      Tema 2 — Limites
derivadas.html    Tema 3 — Derivadas
integrais.html    Tema 4 — Integrais
css/style.css     Estilos (tema escuro, layout responsivo)
js/math.js        Leitor e avaliador de expressões matemáticas
js/graph.js       Gráficos em canvas: curvas, áreas, marcadores, retas auxiliares
js/types.js       Gráficos manipuláveis dos cartões de tipos, casos e regras
js/exercises.js   Correção automática dos exercícios propostos
js/ui.js          Menu mobile, sumário ativo e botão de voltar ao topo
```

## Tecnologias

HTML5, CSS3 e JavaScript (ES6+), sem frameworks nem bibliotecas externas. As fontes Inter, JetBrains Mono e STIX Two Text são carregadas do Google Fonts.
