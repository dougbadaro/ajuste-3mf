# Ajuste 3MF — versão com créditos ao projeto original

Projeto local em `C:\www\ajuste-3mf`, baseado no código público de [Nosso Projeto 3D](https://github.com/nossoprojeto3d/ajuste-3mf), revisão `8d034d9`. O histórico e os créditos originais foram preservados. O visual, os textos, os recursos e a animação do site de referência foram mantidos.

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

Esta versão é publicada em repositório público e no GitHub Pages por solicitação do proprietário. O projeto original é o [Ajuste 3MF, de Nosso Projeto 3D](https://github.com/nossoprojeto3d/ajuste-3mf), também disponível em [seu site original](https://nossoprojeto3d.github.io/ajuste-3mf/). O rodapé reconhece a autoria original e contém links para ambas as versões. Os créditos e o histórico originais foram preservados. Esta cópia não acrescenta uma licença ao código de origem.

Segredos futuros devem ficar em `.env.local`, ignorado pelo Git. O arquivo `.env` versionado contém apenas configurações públicas vazias.
