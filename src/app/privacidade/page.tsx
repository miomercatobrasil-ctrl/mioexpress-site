import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Mio Express trata dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).",
  alternates: { canonical: "/privacidade" },
};

// TEXTO-BASE: substituir/ajustar pelo texto jurídico enviado pela Mio antes da publicação.
export default function Privacidade() {
  return (
    <>
      <Header />
      <main className="legal">
        <div className="container legal__inner">
          <p className="eyebrow">LGPD</p>
          <h1 className="h2">Política de Privacidade</h1>
          <p className="legal__updated">Última atualização: outubro de 2026</p>

          <h2>1. Quem somos</h2>
          <p>
            Este site é mantido por {SITE.legalName}, inscrita no CNPJ {SITE.cnpj}, com sede na {SITE.address.street}, {SITE.address.district},{" "}
            {SITE.address.city} – {SITE.address.state}, CEP {SITE.address.zip} (“Mio Express”), controladora dos dados pessoais tratados por meio
            deste site, nos termos da Lei nº 13.709/2018 (LGPD).
          </p>

          <h2>2. Quais dados coletamos</h2>
          <ul>
            <li>
              <strong>Formulário “Quero no meu condomínio”:</strong> nome, número de WhatsApp, nome do condomínio, número aproximado de unidades e
              cargo. Esses dados não ficam armazenados no site: eles são enviados por você ao nosso WhatsApp.
            </li>
            <li>
              <strong>Dados de navegação:</strong> páginas visitadas, tipo de dispositivo e interações, coletados por cookies e pelo Pixel da Meta
              (Facebook/Instagram), quando ativo.
            </li>
          </ul>

          <h2>3. Para que usamos</h2>
          <ul>
            <li>Responder ao seu contato e apresentar a proposta de implantação (execução de procedimentos preliminares a contrato).</li>
            <li>Medir o desempenho do site e de anúncios (legítimo interesse ou consentimento, conforme o caso).</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>

          <h2>4. Compartilhamento</h2>
          <p>
            Não vendemos dados pessoais. Os dados podem ser tratados por fornecedores que nos ajudam a operar o site e a comunicação, como
            WhatsApp e Meta Platforms (mensagens e medição de anúncios) e Vercel (hospedagem), sempre limitados à finalidade descrita.
          </p>

          <h2>5. Câmeras nas lojas</h2>
          <p>
            As unidades Mio Express são monitoradas por câmeras para segurança dos moradores e do patrimônio. As imagens são confidenciais,
            protegidas e acessadas apenas quando necessário, nos termos da lei.
          </p>

          <h2>6. Por quanto tempo guardamos</h2>
          <p>Mantemos os dados pelo tempo necessário para as finalidades acima ou para cumprir obrigações legais, e depois os excluímos.</p>

          <h2>7. Seus direitos</h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e informações sobre
            compartilhamento, além de revogar consentimentos, pelo WhatsApp {SITE.whatsappDisplay}.
          </p>

          <h2>8. Cookies</h2>
          <p>Você pode bloquear ou apagar cookies nas configurações do seu navegador. Isso pode afetar algumas medições do site.</p>

          <h2>9. Alterações</h2>
          <p>Esta política pode ser atualizada. A versão vigente estará sempre nesta página.</p>

          <p className="legal__back">
            <Link href="/" className="btn btn--ghost btn--sm">
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
