# Graph Report - src  (2026-10-21)

## Corpus Check
- Corpus is ~13,788 words - fits in a single context window. You may not need a graph.

## Summary
- 235 nodes · 564 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Painéis e acordeões
- Leitura e gravação 3MF
- Componentes de apresentação
- Consentimento e medição
- Configuração da interface
- Botões e entradas
- Animação de impressão
- Etapas e processamento
- Exportação e informações
- Formulários e seleção
- Abas da interface
- Mensagens de alerta
- Tipos do projeto
- Grupos de configurações

## God Nodes (most connected - your core abstractions)
1. `cn()` - 102 edges
2. `App()` - 49 edges
3. `track()` - 10 edges
4. `Button()` - 9 edges
5. `openProject()` - 9 edges
6. `buildModified()` - 9 edges
7. `ConsentBanner()` - 8 edges
8. `Separator()` - 8 edges
9. `handleBuffer()` - 7 edges
10. `PrintScene()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `ButtonGroupText()` --calls--> `cn()`  [EXTRACTED]
  components/ui/button-group.tsx → lib/utils.ts
- `InputGroup()` --calls--> `cn()`  [EXTRACTED]
  components/ui/input-group.tsx → lib/utils.ts
- `InputGroupText()` --calls--> `cn()`  [EXTRACTED]
  components/ui/input-group.tsx → lib/utils.ts
- `ItemGroup()` --calls--> `cn()`  [EXTRACTED]
  components/ui/item.tsx → lib/utils.ts
- `ItemContent()` --calls--> `cn()`  [EXTRACTED]
  components/ui/item.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "Painéis e acordeões"
Cohesion: 0.07
Nodes (41): AccordionContent(), AccordionItem(), AccordionTrigger(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+33 more)

### Community 1 - "Leitura e gravação 3MF"
Cohesion: 0.10
Nodes (32): loadExample(), buildModified(), changesText(), coerce(), coerceOne(), crc32(), CRC_T, dec (+24 more)

### Community 2 - "Componentes de apresentação"
Cohesion: 0.11
Nodes (20): Badge(), badgeVariants, ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, FieldSeparator(), Item() (+12 more)

### Community 3 - "Consentimento e medição"
Cohesion: 0.18
Nodes (12): ConsentBanner(), choose(), addScript(), analyticsEnabled(), Consent, GA_ID, getConsent(), initAnalytics() (+4 more)

### Community 4 - "Configuração da interface"
Cohesion: 0.13
Nodes (10): BRANDS, DEFAULT_FORM, EASE, OPT, PIECE_FIELDS, STATUS_LABEL, STATUS_VARIANT, STEPS (+2 more)

### Community 5 - "Botões e entradas"
Cohesion: 0.21
Nodes (12): Button(), buttonVariants, InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput() (+4 more)

### Community 6 - "Animação de impressão"
Cohesion: 0.19
Nodes (12): PrintScene, buildGeometry(), COLD_HIGH, COLD_LOW, HOT, paint(), PrintScene(), frame() (+4 more)

### Community 7 - "Etapas e processamento"
Cohesion: 0.23
Nodes (14): App(), applyResponse(), goTo(), handleBuffer(), onFile(), restart(), scrollToTool(), HeroTitle() (+6 more)

### Community 8 - "Exportação e informações"
Cohesion: 0.22
Nodes (8): copySummary(), download(), saveBlob(), EASE, Faq(), Footer(), QA, track()

### Community 9 - "Formulários e seleção"
Cohesion: 0.25
Nodes (6): SelectField(), Field(), fieldVariants, NativeSelect(), NativeSelectOptGroup(), NativeSelectOption()

### Community 10 - "Abas da interface"
Cohesion: 0.40
Nodes (5): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

### Community 11 - "Mensagens de alerta"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 12 - "Tipos do projeto"
Cohesion: 0.40
Nodes (4): Change, FormData3mf, Project, Spec

## Knowledge Gaps
- **1 isolated node(s):** `GROUPS`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 47 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Painéis e acordeões` to `Componentes de apresentação`, `Configuração da interface`, `Botões e entradas`, `Etapas e processamento`, `Formulários e seleção`, `Abas da interface`, `Mensagens de alerta`?**
  _High betweenness centrality (0.420) - this node is a cross-community bridge._
- **What connects `GROUPS` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Painéis e acordeões` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `Etapas e processamento` to `Painéis e acordeões`, `Leitura e gravação 3MF`, `Componentes de apresentação`, `Consentimento e medição`, `Configuração da interface`, `Botões e entradas`, `Animação de impressão`, `Exportação e informações`, `Formulários e seleção`, `Abas da interface`, `Mensagens de alerta`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Should `Leitura e gravação 3MF` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `Componentes de apresentação` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `Configuração da interface` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._

## Escopo e limites
Grafo estrutural dos 33 arquivos de src; sem extração semântica e sem uso de API paga. O diagnóstico registrou 4 relações com destino ausente, 1 autorrelação e 7 pares colapsados no grafo não dirigido. Dois arquivos de tipos/entrada não produziram símbolos. Ver HEALTH.txt. Os arquivos graphify-out foram incluídos intencionalmente no repositório.
