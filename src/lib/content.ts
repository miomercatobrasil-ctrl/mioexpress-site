// Conteúdo editável do site. Itens marcados com "CONFIRMAR" dependem de validação da Mio.

export const unidades: { nome: string; bairro?: string }[] = [
  // TODO: substituir pela lista real de condomínios atendidos.
  { nome: "Residencial Mediterrâneo" },
];

export const depoimentos: { texto: string; autor: string; papel: string; condominio: string; rascunho?: boolean }[] = [
  {
    // CONFIRMAR: texto real e autorização do condomínio para publicar.
    texto:
      "Espaço reservado para o depoimento do Residencial Mediterrâneo. Envie o texto aprovado pelo síndico e substituímos aqui.",
    autor: "Nome do síndico",
    papel: "Síndico",
    condominio: "Residencial Mediterrâneo",
    rascunho: true,
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
