import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LGPD() {
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
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Proteção de Dados - LGPD</h1>
              <p className="text-sm text-muted-foreground mt-1">Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <h2 className="text-base font-semibold text-foreground mb-2">Nosso Compromisso</h2>
              <p>
                O CaixaCertus está em conformidade com a Lei Geral de Proteção de Dados (LGPD). 
                Tratamos seus dados com transparência, segurança e respeito à sua privacidade.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Bases Legais para Tratamento</h2>
              <p className="mb-3">Tratamos seus dados com base em:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Execução de contrato:</strong> para fornecer o serviço contratado</li>
                <li><strong>Consentimento:</strong> para comunicações opcionais</li>
                <li><strong>Legítimo interesse:</strong> para melhorias e segurança do sistema</li>
                <li><strong>Cumprimento legal:</strong> quando exigido por lei</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Seus Direitos como Titular</h2>
              <p className="mb-3">A LGPD garante os seguintes direitos:</p>
              <div className="grid gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Confirmação e Acesso</h3>
                  <p className="text-xs mt-1">Confirmar se tratamos seus dados e acessar uma cópia deles.</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Correção</h3>
                  <p className="text-xs mt-1">Solicitar correção de dados incompletos, inexatos ou desatualizados.</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Eliminação</h3>
                  <p className="text-xs mt-1">Solicitar a exclusão de dados tratados com base no consentimento.</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Portabilidade</h3>
                  <p className="text-xs mt-1">Receber seus dados em formato estruturado para transferência.</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Revogação</h3>
                  <p className="text-xs mt-1">Revogar consentimentos previamente fornecidos.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Medidas de Segurança</h2>
              <p className="mb-3">Adotamos medidas técnicas e administrativas para proteger seus dados:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controle de acesso baseado em funções</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups regulares e recuperação de desastres</li>
                <li>Treinamento de equipe sobre proteção de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Incidentes de Segurança</h2>
              <p>
                Em caso de incidente de segurança que possa causar risco ou dano relevante, notificaremos 
                a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados conforme determina 
                a legislação, descrevendo a natureza dos dados afetados e as medidas adotadas.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Encarregado de Dados (DPO)</h2>
              <p>
                Mantemos um responsável pelo tratamento de dados pessoais. Para exercer seus direitos ou 
                esclarecer dúvidas sobre proteção de dados, utilize os canais de contato disponíveis nas 
                configurações do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Como Exercer Seus Direitos</h2>
              <p className="mb-3">Para solicitar informações ou exercer seus direitos:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse as configurações do sistema</li>
                <li>Identifique-se como titular dos dados</li>
                <li>Descreva sua solicitação de forma clara</li>
                <li>Aguarde resposta em até 15 dias úteis</li>
              </ol>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
              <Shield size={12} />
              <span>CaixaCertus • Dados protegidos conforme LGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
