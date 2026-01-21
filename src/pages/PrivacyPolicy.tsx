import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="bg-card rounded-xl border border-border p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: Janeiro de 2026</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">1. Introdução</h2>
              <p>
                O CaixaCertus é um sistema de gestão financeira desenvolvido para profissionais autônomos e pequenos negócios. 
                Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais em conformidade 
                com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">2. Dados Coletados</h2>
              <p className="mb-3">Coletamos apenas os dados necessários para o funcionamento do sistema:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Dados de cadastro: nome, e-mail</li>
                <li>Dados de clientes: nome, telefone, e-mail (inseridos por você)</li>
                <li>Dados financeiros: lançamentos, despesas, serviços e produtos</li>
                <li>Dados de acesso: logs de autenticação para segurança</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">3. Finalidade do Tratamento</h2>
              <p className="mb-3">Seus dados são utilizados exclusivamente para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Fornecer as funcionalidades do sistema</li>
                <li>Gerar relatórios e análises financeiras</li>
                <li>Garantir a segurança da sua conta</li>
                <li>Enviar comunicações essenciais sobre o serviço</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">4. Compartilhamento de Dados</h2>
              <p>
                Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. 
                Seus dados podem ser compartilhados apenas com provedores de infraestrutura necessários para o 
                funcionamento do sistema, sempre sob acordos de confidencialidade.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">5. Segurança</h2>
              <p>
                Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia, 
                controle de acesso e monitoramento contínuo. Seus dados são armazenados em servidores seguros com 
                backups regulares.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">6. Seus Direitos</h2>
              <p className="mb-3">Conforme a LGPD, você tem direito a:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão dos seus dados</li>
                <li>Revogar consentimentos</li>
                <li>Obter informações sobre o compartilhamento de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">7. Retenção de Dados</h2>
              <p>
                Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações 
                legais. Após o encerramento da conta, os dados são excluídos em até 30 dias, exceto quando houver 
                obrigação legal de retenção.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">8. Contato</h2>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato através do 
                e-mail disponível nas configurações do sistema.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground/70 text-center">
              CaixaCertus • Sistema licenciado • Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
