# 1570 — Controlled moving-history GPU result review

2026-10-18 UTC. Verdict: BOUNDED COMPONENT PASS. Independent read-only review of actual gpu1566-run3 finds no material blocker to native comparison. This is not A6/all35/all14,native quality,cost or final five-gate acceptance. Root owns acceptance.

Actual payload/result.json SHA-256 ecae2a182492a9336e4a7a7c372daa359afeafcaf79ab82f2fed610424b2fe37;controller-cleanup.json c1657d5198ba89be6260e514b918c73c99676a831e104ee212ef8e6f9022c77c;external-supervisor.json eed739c53cc4f100382a86df22b600121955a7de8e7c2cd1b630c349cc3b2677. Reconciled exact1567/1560 receipts,13source pins,fixture/helper/PRIMARY dependency pins and actual sourcePins. Source/protocol remain unchanged. Read20unique rows,28captured frames and cleanup/supervisor facts; independently recomputed claims below from retained native arrays without GPU work or test reruns. No source/data/index/Git writes or owned runtime.

Actual renderer: RTX4090 through ANGLE/D3D11. All20 controls passed; no reported console/request/WebGL error. The32predeclared analytic priorUV samples recompute32/32candidate matches,max linear error.00018310546875; all32separate from wrongUV. e109moving recomputes0/32matches,expected RED(max error.361151123046875).

Using actual3x3 current/prior body/influence targets and retained radiance/clamp qualification,contact receiver recomputes69/69current-only outputs(error0):32current-only influence and37prior-only influence. Shadow recomputes22/22(error0):11current-only and11prior-only influence. These pixels are outside both actual dilated body masks. Each effect scene retains5278/5278eligible background blends,max error.000396728515625; this excludes a whole-frame history veto in these controlled scenes.

Still→moving contact14/14 and shadow10/10old-footprint pixels recompute current-only; all firstmoving interior errors0,historyReady0. Subsequent repeatedfalse moving frames retain5066/5066eligible blends per scene,max error.0001983642578125,historyReady1. Firstframe,explicit style-boundary invalidation,lighting apply and resize raw interiors each recompute exactlycurrent. Resize is161x121native with322x242scene sample target. Depth/body uncovered points equal current. Teardown's narrow GPU texture count returns4→4.

Runner records normal Vite/context closes,zero pending and fulfilled cleanup; controller took7487.2276ms,exit0,with no termination requests. Fresh final census is available with zero known/omitted/late/marker survivors and portCLOSED. External supervisor did not time out and records exit0. These are this run's observed closure facts,not proof of every timeout branch.

Real-app input wiring,actual pedestrian/train geometry,complete adjacent native S0/S1/held-out motion,AO/bloom stability,detail/cost,population/FPS,full lifecycle and final integrated five gates remain owed. Earlier failed/partial runs remain preserved; no result transfer beyond these controlled component bounds.
