# Ajuste 3MF — réplica privada

Projeto local em `C:\www\ajuste-3mf`, baseado no código público de [Nosso Projeto 3D](https://github.com/nossoprojeto3d/ajuste-3mf), revisão `8d034d9`. O histórico e os créditos originais foram preservados. O visual, os textos, os recursos e a animação do site de referência foram mantidos.

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
- O workflow apenas testa, verifica tipos e compila. Não publica no GitHub Pages.
- Código de aplicação e recursos visuais preservados.
- Mapa Graphify incluído em `graphify-out/`: `graph.html`, `graph.json`, `GRAPH_REPORT.md` e `HEALTH.txt`.

O Graphify analisou os 33 arquivos de `src`, gerando 235 nós, 564 relações e 15 comunidades sem API paga. O diagnóstico apontou quatro relações com destino ausente, uma autorrelação e sete pares de relações colapsados no grafo não dirigido. São limites do mapa estrutural; consulte `HEALTH.txt`.

## Validação

Os seis testes existentes verificam leitura, validação, gravação e reabertura do 3MF, incluindo `different_settings_to_system`. TypeScript e build de produção também foram verificados. O build mantém o aviso de tamanho dos pacotes Three.js/interface acima de 500 kB.

## Privacidade e origem

Esta cópia foi preparada para um repositório privado. Os links da marca continuam apontando para o autor original para preservar a referência solicitada. Não há licença de redistribuição declarada na origem; esta cópia não acrescenta uma licença nem altera os créditos originais.

Segredos futuros devem ficar em `.env.local`, ignorado pelo Git. O arquivo `.env` versionado contém apenas configurações públicas vazias.
