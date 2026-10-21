import test from "node:test"
import assert from "node:assert/strict"
import { openProject, buildSummary, extractJson, evaluateChanges, buildModified, makeExample, fmtVal } from "../src/lib/threemf.js"

const form = { printer: "Bambu Lab A1", nozzle: "0.4", ams: "AMS lite (4 cores)", filType: "PLA", brand: "Multifila", use: "Decorativa", prio: "Equilibrada", notes: "" }
const RESP = '```json\n{"alteracoes":[' +
  '{"chave":"layer_height","valor":"0.16","motivo":"detalhe"},' +
  '{"chave":"wall_loops","valor":4},' +
  '{"chave":"sparse_infill_density","valor":"20"},' +
  '{"chave":"nozzle_temperature","valor":215},' +
  '{"chave":"layer_height","valor":"0.5"},' +
  '{"chave":"machine_max_speed_x","valor":"900"},' +
  '{"chave":"sparse_infill_pattern","valor":"Gyroid"},' +
  '{"chave":"brim_type","valor":"auto_brim"},' +
  '{"chave":"fan_min_speed","valor":[50,50]}' + ']}\n```'

test("lê o projeto de exemplo", async () => {
  const p = await openProject(await makeExample())
  assert.equal(p.objects[0].name, "Suporte de celular")
  assert.deepEqual(p.objects[0].overrides, ["wall_loops"])
  assert.equal(p.plates, 1)
  assert.match(buildSummary(p, form, "x.3mf"), /layer_height = 0.2/)
})

test("valida as alterações", async () => {
  const p = await openProject(await makeExample())
  const it = evaluateChanges(p, extractJson(RESP))
  assert.equal(it[0].status, "change")
  assert.deepEqual(it[1].conflicts, ["Suporte de celular"])
  assert.equal(it[2].after, "20%")
  assert.deepEqual(it[3].after, ["215", "215", "215", "215"])
  assert.equal(it[4].status, "bad")
  assert.equal(it[5].status, "bad")
  assert.equal(it[6].after, "gyroid")
  assert.equal(it[7].status, "same")
  assert.equal(it[8].status, "bad")
})

test("grava um 3MF que reabre com os valores novos", async () => {
  const p = await openProject(await makeExample())
  const acc = evaluateChanges(p, extractJson(RESP)).filter((i) => i.status === "change")
  for (const removeOverrides of [false, true]) {
    const out = new Uint8Array(await (await buildModified(p, acc, { removeOverrides })).arrayBuffer())
    const p2 = await openProject(out)
    assert.equal(p2.cfg.layer_height, "0.16")
    assert.equal(p2.cfg.sparse_infill_density, "20%")
    assert.equal(p2.cfg.printer_model, "Bambu Lab A1")
    assert.equal(p2.objects[0].overrides.length, removeOverrides ? 0 : 1)
  }
})

test("marca as chaves alteradas para o Bambu Studio não voltar ao perfil do sistema", async () => {
  // Ao abrir o projeto, o Bambu Studio volta ao valor do perfil toda chave fora de different_settings_to_system.
  const p = await openProject(await makeExample())
  const acc = evaluateChanges(p, extractJson(RESP)).filter((i) => i.status === "change")
  const out = new Uint8Array(await (await buildModified(p, acc)).arrayBuffer())
  const d = (await openProject(out)).cfg.different_settings_to_system
  assert.equal(d.length, 6)
  const keys = (s) => s.split(";").filter(Boolean)
  assert.deepEqual(keys(d[0]), ["enable_support", "layer_height", "wall_loops", "sparse_infill_density", "sparse_infill_pattern"])
  for (const i of [1, 2, 3, 4]) assert.deepEqual(keys(d[i]), ["nozzle_temperature"])
  assert.equal(d[5], "")
})

test("cria a lista de diferenças quando o projeto não tem", async () => {
  const p = await openProject(await makeExample())
  delete p.cfg.different_settings_to_system
  const acc = evaluateChanges(p, extractJson(RESP)).filter((i) => i.status === "change")
  const out = new Uint8Array(await (await buildModified(p, acc)).arrayBuffer())
  const d = (await openProject(out)).cfg.different_settings_to_system
  assert.equal(d.length, 6)
  assert.ok(d[0].split(";").includes("layer_height"))
  assert.ok(d[2].split(";").includes("nozzle_temperature"))
})

test("altera a parede única do topo e marca para o Bambu Studio", async () => {
  const p = await openProject(await makeExample())
  const it = evaluateChanges(p, { alteracoes: [
    { chave: "top_one_wall_type", valor: "not apply" },
    { chave: "top_one_wall_type", valor: "duas paredes" },
  ] })
  assert.equal(it[0].status, "change")
  assert.equal(it[0].after, "not apply")
  assert.equal(it[1].status, "bad")
  assert.match(buildSummary(p, form, "x.3mf"), /top_one_wall_type = all top/)
  const out = await openProject(new Uint8Array(await (await buildModified(p, [it[0]])).arrayBuffer()))
  assert.equal(out.cfg.top_one_wall_type, "not apply")
  assert.ok(out.cfg.different_settings_to_system[0].split(";").includes("top_one_wall_type"))
})


test("oferece passar ferro no JSON mesmo quando as chaves são herdadas", async () => {
  const p = await openProject(await makeExample())
  const missing = buildSummary(p, { ...form, prio: "Qualidade visual" }, "face-lisa.3mf")
  assert.match(missing, /engomar \/ passar ferro/)
  assert.match(missing, /faces superiores planas/)
  assert.match(missing, /Você PODE e deve incluí-las no JSON/)
  assert.match(missing, /ironing_flow: faixa: 0 a 100%/)
  assert.doesNotMatch(missing, /Não a adicione ao JSON/)
  assert.match(missing, /sem colchetes nem unidade/)
  assert.equal("ironing_type" in p.cfg, false)

  p.cfg.ironing_type = "no ironing"
  const present = buildSummary(p, form, "face-lisa.3mf")
  assert.match(present, /ironing_type = no ironing/)
  assert.match(present, /ironing_type: valores: no ironing, top, topmost, solid/)
  assert.doesNotMatch(present, /Não a adicione ao JSON/)
})

test("grava passar ferro, rejeita opção inválida e preserva a diferença do perfil", async () => {
  const p = await openProject(await makeExample())
  p.cfg.ironing_type = "no ironing"
  const changes = evaluateChanges(p, { alteracoes: [
    { chave: "ironing_type", valor: "top", motivo: "Acabamento das faces planas" },
    { chave: "ironing_type", valor: "ligado" },
  ] })
  assert.equal(changes[0].status, "change")
  assert.equal(changes[1].status, "bad")
  const out = await openProject(new Uint8Array(await (await buildModified(p, [changes[0]])).arrayBuffer()))
  assert.equal(out.cfg.ironing_type, "top")
  assert.ok(out.cfg.different_settings_to_system[0].split(";").includes("ironing_type"))
})


test("cria todas as opções de engomar ausentes e reabre o 3MF com elas", async () => {
  const p = await openProject(await makeExample())
  const requested = [
    { chave: "ironing_type", valor: "top" },
    { chave: "ironing_speed", valor: "30" },
    { chave: "ironing_flow", valor: "15%" },
    { chave: "ironing_spacing", valor: "0.15" },
    { chave: "ironing_inset", valor: "0.21" },
  ]
  const original = JSON.stringify(p.cfg)
  const changes = evaluateChanges(p, { alteracoes: requested })
  assert.ok(changes.every(c => c.status === "change"))
  assert.ok(changes.every(c => c.before === undefined))
  assert.match(fmtVal(changes[0].spec, changes[0].before), /Herdado do perfil/)
  assert.equal(JSON.stringify(p.cfg), original)
  for (const noDiffList of [false, true]) {
    if (noDiffList) delete p.cfg.different_settings_to_system
    const out = await openProject(new Uint8Array(await (await buildModified(p, changes)).arrayBuffer()))
    for (const item of requested) {
      assert.equal(out.cfg[item.chave], item.valor)
      assert.ok(out.cfg.different_settings_to_system[0].split(";").includes(item.chave))
    }
    for (const slot of out.cfg.different_settings_to_system.slice(1)) assert.doesNotMatch(slot, /ironing_/)
    assert.ok(evaluateChanges(out, { alteracoes: requested }).every(c => c.status === "same"))
  }
})

test("criar engomar não libera valores inválidos nem outras chaves ausentes", async () => {
  const p = await openProject(await makeExample())
  const changes = evaluateChanges(p, { alteracoes: [
    { chave: "ironing_type", valor: "ligado" },
    { chave: "ironing_speed", valor: "0" },
    { chave: "ironing_flow", valor: "101%" },
    { chave: "ironing_spacing", valor: "0" },
    { chave: "ironing_inset", valor: "-1" },
    { chave: "ironing_fake", valor: "1" },
    { chave: "support_style", valor: "snug" },
  ] })
  assert.ok(changes.every(c => c.status === "bad"))
  assert.equal("ironing_type" in p.cfg, false)
})

test("preserva fluxo de engomar como percentual mesmo se a origem usa número", async () => {
  const p = await openProject(await makeExample())
  p.cfg.ironing_flow = 10
  const [change] = evaluateChanges(p, { alteracoes: [{ chave: "ironing_flow", valor: "15%" }] })
  assert.equal(change.status, "change")
  assert.equal(change.after, "15%")
  const out = await openProject(new Uint8Array(await (await buildModified(p, [change])).arrayBuffer()))
  assert.equal(out.cfg.ironing_flow, "15%")
})
