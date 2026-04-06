# Guia de Operacao e Ativacao

## Objetivo
Colocar o site no ar com controle operacional, rastreamento de conversao e processo claro para responder pedidos de orcamento B2B.

## Melhor opcao disponivel agora
Use esta stack:
- `Netlify Forms` como captacao principal
- `GA4` como analytics principal
- `Meta Pixel` como camada de remarketing
- `Webhook / CRM` somente como segunda fase

Motivo:
- entra no ar mais rapido
- reduz risco tecnico
- nao depende de backend para comecar
- ja entrega captacao, leitura de performance e base para anuncios
- permite evoluir depois para CRM sem refazer o site

## O que ja esta pronto
- Captacao com `CNPJ` obrigatorio em todos os formularios principais
- CTA para WhatsApp
- Portfolio FEFCO com selecao de modelos
- Configurador guiado
- Pedido tecnico direto para `Caixa`, `Acessorio` ou `Caixa + Acessorio`
- Fichas tecnicas independentes por modelo selecionado
- Painel local preservado fora da publicação em `C:\Users\lucca\new-age-embalagens-site-private-panel`
- Exportacao local de leads e eventos em JSON
- Preparacao para `Netlify Forms`
- Preparacao para `Webhook`, `GA4` e `Meta Pixel`
- Carregamento dinamico de `GA4` e `Meta Pixel` ao informar os IDs no painel
- Enriquecimento automatico dos leads com pagina, referrer, dispositivo e contexto de origem

## URLs principais
- Home: `/`
- Orcamento rapido: `/orcamento-rapido/`
- Hub FEFCO: `/modelos-fefco/`
- Painel local: `C:\Users\lucca\new-age-embalagens-site-private-panel\index.html`

## Como ativar nas proximas horas
1. Publicar a pasta no Netlify.
2. Confirmar o dominio `www.newage.ind.br` e o redirecionamento do dominio principal.
3. Criar e copiar o `GA4 Measurement ID`.
4. Criar e copiar o `Meta Pixel ID`.
5. Abrir `C:\Users\lucca\new-age-embalagens-site-private-panel\index.html` e salvar a configuracao local inicial.
6. Testar envio de todos os formularios.
7. Testar o botao flutuante de WhatsApp.
8. Confirmar que o Netlify esta captando os envios.

## Configuracao minima recomendada
No painel, preencher:
- `WhatsApp comercial`
- `E-mail comercial`
- `Webhook / CRM endpoint` se houver
- `GA4 Measurement ID`
- `Meta Pixel ID`

Depois disso:
- o `GA4` passa a carregar e registrar navegacao e geracao de lead
- o `Meta Pixel` passa a carregar `PageView` e `Lead`
- o painel continua registrando eventos e leads localmente neste navegador
- o `Netlify Forms` continua como rota principal de captacao mesmo sem webhook

## Indicadores mais uteis para operar
No painel, acompanhar:
- `Leads captados`
- `Empresas unicas`
- `Conversao local`
- `Pedidos diretos`
- `Pedidos guiados`
- `Com acessorio`
- `Cliques em CTA`
- `Configurador usado`
- `Recomendacoes aplicadas`
- `Selecoes FEFCO`

## Como ler os dados
- `Pedidos diretos` mostram quem ja chegou pronto para comprar.
- `Pedidos guiados` medem o valor do motor de recomendacao.
- `Com acessorio` revela oportunidade de ticket maior.
- `Selecoes FEFCO` mostram interesse real por modelos padrao.
- `Fallback WhatsApp` alto demais indica necessidade de revisar formulario ou endpoint.

## Estrategia de resposta comercial
1. Priorizar leads com `CNPJ`, telefone, item principal e quantidade preenchidos.
2. Atender primeiro quem informou:
   - dimensoes
   - quantidade
   - link de arte
   - modelo FEFCO
3. Tratar pedidos com acessorio como oportunidade de venda consultiva.
4. Responder mais rapido leads vindos de `pedido tecnico direto`.

## Controle total recomendado
Para sair do controle local e ter visao real de todos os visitantes:
- usar `GA4` para aquisicao, paginas e eventos
- usar `Meta Pixel` para remarketing
- usar `Netlify Forms` como base imediata de captacao
- usar `Webhook` depois para centralizar em CRM, planilha ou automacao
- usar `Google Search Console` para SEO e indexacao
- usar planilha, CRM ou automacao para follow-up

## Estrutura de webhook sugerida
Enviar os leads para um endpoint que grave:
- data e hora
- nome
- empresa
- cnpj
- telefone
- email
- tipo de pedido
- item principal
- tipo de embalagem
- modelos padrao
- especificacoes por modelo
- observacoes
- origem UTM
- URL da pagina
- titulo da pagina
- referrer
- tipo de dispositivo
- tamanho de tela

## Rotina diaria recomendada
1. Abrir `C:\Users\lucca\new-age-embalagens-site-private-panel\index.html`
2. Exportar `leads`
3. Exportar `eventos`
4. Verificar configuracao e checklist
5. Responder leads mais qualificados
6. Revisar gargalos de conversao

## Gargalos para observar
- muito clique em CTA e pouco lead
- muito uso do configurador e pouca aplicacao de recomendacao
- muito lead sem especificacao tecnica
- muito fallback para WhatsApp

## Proxima evolucao ideal
- integrar com CRM real
- criar dashboard centralizado no backend
- registrar usuarios e atendimentos
- disparar notificacao por e-mail ou WhatsApp interno a cada novo lead
- ligar Search Console e GA4 para leitura nacional de SEO
