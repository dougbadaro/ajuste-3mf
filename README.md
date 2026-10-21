# Ajuste 3MF — versão com créditos ao projeto original

Projeto local em `C:\www\ajuste-3mf`, baseado no código público de [projeto de referência](https://github.com/nossoprojeto3d/ajuste-3mf), revisão `8d034d9`. O histórico e os créditos originais foram preservados. A estrutura e o fluxo do site de referência foram preservados; esta versão personaliza a paleta para roxo e troca o vaso pelo 3DBenchy.

Site: https://dougbadaro.github.io/ajuste-3mf/

## Executar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173).

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`dist/` contém a versão compilada e não é versionada. O projeto funciona em subpastas porque o Vite usa `base: './'`.

## Tecnologia e funcionamento

React 19, TypeScript, Vite, Tailwind CSS, Motion e Three.js. As fontes e imagens ficam no próprio projeto. O processamento ZIP/3MF ocorre no navegador, sem backend e sem chave de API.

1. Abra um projeto `.3mf` salvo pelo Bambu Studio.
2. Confira impressora, filamentos, uso e prioridade; copie o resumo para a IA.
3. Cole o JSON, confira as mudanças e baixe o arquivo ajustado.

Valores numéricos no JSON devem ser escalares, por exemplo `"50"`, sem colchetes. Configurações desconhecidas ou fora dos limites aparecem como ignoradas. O exemplo integrado não permite download; use um arquivo real para exportar. Abra o resultado no Bambu Studio e fatie novamente.

## Ajustes desta cópia

- IDs de Analytics e Meta Pixel vazios em `.env`; nenhum evento é enviado ao proprietário do site original.
- O workflow testa, verifica tipos, compila e publica no GitHub Pages a cada push na `main`. Pull requests apenas validam o projeto.
- Recursos visuais preservados e créditos explícitos no rodapé, com links para o site e o código-fonte originais.
- Mapa Graphify incluído em `graphify-out/`: `graph.html`, `graph.json`, `GRAPH_REPORT.md` e `HEALTH.txt`.

O Graphify analisou os 33 arquivos de `src`, gerando 235 nós, 564 relações e 15 comunidades sem API paga. O diagnóstico apontou quatro relações com destino ausente, uma autorrelação e sete pares de relações colapsados no grafo não dirigido. São limites do mapa estrutural; consulte `HEALTH.txt`.

## Validação

Os seis testes existentes verificam leitura, validação, gravação e reabertura do 3MF, incluindo `different_settings_to_system`. TypeScript e build de produção também foram verificados. O build mantém o aviso de tamanho dos pacotes Three.js/interface acima de 500 kB.

## Privacidade e origem

Esta versão é publicada em repositório público e no GitHub Pages por solicitação do proprietário. O projeto original é o [Ajuste 3MF, de projeto de referência](https://github.com/nossoprojeto3d/ajuste-3mf), também disponível em [seu site original](https://nossoprojeto3d.github.io/ajuste-3mf/). O rodapé reconhece a autoria original e contém links para ambas as versões. Os créditos e o histórico originais foram preservados. Esta cópia não acrescenta uma licença ao código de origem.

Segredos futuros devem ficar em `.env.local`, ignorado pelo Git. O arquivo `.env` versionado contém apenas configurações públicas vazias.


## Tema roxo e barquinho

O destaque da interface é `#A75EFF`. Os atalhos do Instagram foram removidos do cabeçalho e do rodapé. A animação usa 152 cortes horizontais do [STL oficial do 3DBenchy](https://github.com/CreativeTools/3DBenchy/blob/master/Single-part/3DBenchy.stl), com casco, cabine, janelas e chaminé. O modelo é de Daniel Norée / Creative Tools, atualmente disponibilizado sob [CC0](https://www.3dbenchy.com/license/). Os contornos ficam em `public/models/benchy-layers.json` e são carregados depois da interface. A impressão pausa fora da tela e respeita a preferência por movimento reduzido.

Para regenerar os contornos, instale `numpy` em um ambiente Python e execute `python tools/generate-benchy-layers.py caminho/3DBenchy.stl` com o STL oficial.

## Identidade própria

Ajuste 3MF usa uma logo vetorial própria, com três camadas de fatiamento em traço fino. O rodapé mantém um link discreto para a origem, sem usar o nome ou os logos anteriores como identidade do site. Os contornos do barquinho omitem a inscrição na base do STL original.

## Logo slim e acabamento

A marca usa um ícone de três camadas em traço fino, sem moldura, remetendo a um fatiador 3D. O resumo para a IA solicita avaliar engomar/passar ferro nas faces superiores planas, respeitando filamento, geometria e tempo adicional. O JSON pode criar `ironing_type`, `ironing_speed`, `ironing_flow`, `ironing_spacing` e `ironing_inset` mesmo quando herdados do perfil e ausentes do arquivo. O aplicativo valida os valores e grava as novas chaves no perfil de processo, incluindo `different_settings_to_system`. O app continua exigindo confirmação das mudanças antes de baixar o 3MF.

As opções de passar ferro seguem os nomes de configuração do [Bambu Studio](https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/PrintConfig.cpp). Quando uma opção está ausente, a comparação mostra “Herdado do perfil”, sem inventar um valor anterior. As demais chaves ausentes continuam sendo rejeitadas.
