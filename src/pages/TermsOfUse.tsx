import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfUse() {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: Janeiro de 2026</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar o CaixaCertus, você concorda com estes Termos de Uso. Se não concordar com 
                qualquer parte destes termos, não utilize o sistema. O uso continuado constitui aceitação de 
                eventuais alterações.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
              <p>
                O CaixaCertus é um sistema de gestão financeira que permite o controle de receitas, despesas, 
                clientes e serviços. O sistema é fornecido como ferramenta de apoio à gestão, não substituindo 
                assessoria contábil ou financeira profissional.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">3. Cadastro e Acesso</h2>
              <p className="mb-3">Para utilizar o sistema, você deve:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade da sua senha</li>
                <li>Notificar imediatamente sobre uso não autorizado</li>
                <li>Ser responsável por todas as atividades realizadas em sua conta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">4. Uso Adequado</h2>
              <p className="mb-3">Você concorda em não:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Violar leis ou regulamentos aplicáveis</li>
                <li>Interferir no funcionamento do sistema</li>
                <li>Tentar acessar áreas restritas ou dados de outros usuários</li>
                <li>Usar o sistema para fins ilegais ou não autorizados</li>
                <li>Reproduzir, copiar ou revender o sistema</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">5. Propriedade Intelectual</h2>
              <p>
                O CaixaCertus, incluindo seu código, design, funcionalidades e marca, é protegido por direitos 
                autorais e propriedade intelectual. A licença de uso concedida é limitada, não exclusiva e 
                intransferível, destinada exclusivamente ao uso pessoal ou profissional conforme contratado.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">6. Seus Dados</h2>
              <p>
                Você mantém a propriedade dos dados que insere no sistema. Concede-nos licença para processar 
                esses dados exclusivamente para fornecer o serviço. Podemos exportar seus dados a qualquer 
                momento mediante solicitação.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">7. Disponibilidade</h2>
              <p>
                Nos esforçamos para manter o sistema disponível continuamente, mas não garantimos disponibilidade 
                ininterrupta. Podemos realizar manutenções programadas e, quando possível, notificaremos com antecedência.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">8. Limitação de Responsabilidade</h2>
              <p>
                O CaixaCertus é fornecido "como está". Não nos responsabilizamos por decisões tomadas com base 
                nas informações do sistema, perdas financeiras indiretas ou danos decorrentes de uso inadequado 
                ou interrupções do serviço.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">9. Alterações nos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas 
                serão comunicadas através do sistema. O uso continuado após as alterações constitui aceitação.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">10. Foro</h2>
              <p>
                Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão resolvidas no foro da 
                comarca do titular do sistema, com renúncia a qualquer outro.
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
