// Conteúdo editável do site. Itens marcados com "CONFIRMAR" dependem de validação da Mio.

export const unidades: { nome: string; unidades?: number }[] = [
  { nome: "Terraços", unidades: 296 },
  { nome: "Portal da Vila", unidades: 150 },
  { nome: "Adiana", unidades: 72 },
  { nome: "Reiwa", unidades: 90 },
  { nome: "Bourbon", unidades: 192 },
  { nome: "Home", unidades: 176 },
  { nome: "Kazza", unidades: 120 },
  { nome: "Itapoã", unidades: 90 },
  { nome: "Rio Branco", unidades: 72 },
  { nome: "Maragogi", unidades: 91 },
  { nome: "San Francisco", unidades: 64 },
  { nome: "Porto Régio", unidades: 64 },
  { nome: "Tahiti" },
  { nome: "Redentor", unidades: 60 },
  { nome: "Mediterrâneo", unidades: 120 },
  { nome: "Estoril" },
  { nome: "Itamarati", unidades: 80 },
  { nome: "Girassol", unidades: 64 },
  { nome: "Millenium" },
  { nome: "Solar", unidades: 90 },
];

export const depoimentos: { texto: string; destaque: string; condominio: string; autor?: string; rascunho?: boolean }[] = [
  {
    destaque: "Recomendo com total confiança.",
    texto:
      "Sou síndico do Residencial Mediterrâneo e, desde o momento em que escolhi a Mio Express para atender nossos moradores, nunca tivemos qualquer tipo de problema. Pelo contrário, sempre fomos muito bem atendidos. A equipe é extremamente atenciosa, prestativa e está sempre pronta para nos ajudar em qualquer situação. A implantação foi tranquila, o suporte é eficiente e a comunicação é clara e rápida, algo fundamental na rotina de um condomínio. É muito gratificante poder contar com uma empresa parceira, comprometida e que realmente se preocupa em oferecer um serviço de qualidade aos moradores.",
    autor: "Síndico",
    condominio: "Condomínio Residencial Mediterrâneo",
  },
  {
    destaque: "Os moradores usam bastante.",
    texto:
      "A Mio está no nosso condomínio desde 2023 e tem sido muito útil no dia a dia. Os moradores usam bastante, principalmente pela praticidade de ter um mini mercado dentro do prédio. O abastecimento é ótimo e facilita muito a rotina.",
    condominio: "Condomínio Campo Di Bourbon",
  },
  {
    destaque: "Sempre tem o que precisamos.",
    texto:
      "O mercadinho Mio Express foi instalado aqui no condomínio há aproximadamente um ano e tem sido muito útil no dia a dia. É uma ótima opção para emergências, pois sempre tem o que precisamos com praticidade e rapidez, sem precisar sair do prédio. O pagamento é fácil de ser feito, os produtos são repostos com rapidez e o serviço atende muito bem quem precisa de agilidade e comodidade dentro do condomínio. É um ótimo estabelecimento.",
    condominio: "Condomínio Solar Paraíso",
  },
];

export const categorias = [
  "Bebidas geladas",
  "Snacks",
  "Mercearia",
  "Limpeza",
  "Higiene",
  "Sorvetes",
  "Congelados",
  "Café da manhã",
  "Pet",
];

// Perguntas frequentes (texto dos destaques "Dúvidas" do Instagram da Mio)
export const faq: { q: string; a: string }[] = [
  {
    q: "Em caso de furto, a responsabilidade é de quem?",
    a: "A responsabilidade é 100% da Mio. O condomínio contribui apenas com a identificação dos moradores.",
  },
  {
    q: "Vocês instalam câmera de segurança?",
    a: "Damos duas opções: instalamos a nossa câmera ou usamos a câmera do próprio condomínio. A escolha fica a critério do síndico.",
  },
  {
    q: "Qual o prazo para a instalação?",
    a: "Por ser um projeto 100% customizado para o espaço de cada condomínio, a instalação leva em média 20 dias corridos.",
  },
  {
    q: "Qual o custo para o condomínio?",
    a: "Zero. Além de não ter custo, alguns condomínios podem ter um retorno financeiro (cashback), conforme as condições de cada unidade.",
  },
  {
    q: "E o valor dos produtos, é caro?",
    a: "Não, nossos valores são justos: ficam entre o preço de um supermercado e o de uma conveniência, sempre buscando praticidade e comodidade.",
  },
  {
    q: "Como funciona o abastecimento?",
    a: "Por meio de um sistema de gestão, identificamos o consumo e fazemos o abastecimento adequado. Ele é feito pelo time da Mio, de forma independente e discreta.",
  },
  {
    q: "Quem pode comprar na Mio?",
    a: "Todos os moradores e visitantes cadastrados no condomínio, com pagamento direto no totem.",
  },
  {
    q: "Quais as formas de pagamento?",
    a: "Pix e cartão de crédito ou débito, por aproximação ou chip, direto no totem de autoatendimento.",
  },
  {
    q: "Qual o tamanho mínimo do condomínio?",
    a: "Atendemos condomínios a partir de 80 apartamentos. Esse é o número ideal para garantir variedade de produtos e reposição constante.",
  },
  {
    q: "A Mio Express é uma franquia?",
    a: "Não. Somos uma empresa local, de São José dos Campos, e atendemos diretamente os condomínios da região, com equipe própria e suporte rápido.",
  },
];
