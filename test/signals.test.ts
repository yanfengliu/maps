/**
 * Bounds: four complete cycles at 60 Hz, every stage boundary, occupied clearance,
 * immutable step size and vehicle footprint clearance. Visual traffic obedience
 * and downstream capacity are simulation gates, not claims made by this controller.
 */
import { describe, expect, it } from "vitest";
import { SignalController } from "../src/network/signals.ts";
import { occupiesJunction } from "../src/network/geometry.ts";
import type { Junction } from "../src/world/network-data.ts";

const junction: Junction = { id: "j",controlKind:"signal",controlSource:"authored", position: {x:0,y:15,z:0}, radiusM:10, vehicleGroups:["a","b"],pedestrianGroup:"p",clearanceSeconds:2,vehicleGreenSeconds:4,pedestrianGreenSeconds:3 };

describe("shared traffic signal", () => {
  it("runs four whole cycles with mutually exclusive entry, observed amber and all-red", () => {
    const signals = new SignalController([junction]);
    const stages = new Set<string>(), groups = new Set<string>();
    for (let tick=0;tick<60*110;tick+=1) {
      const state=signals.snapshot()[0]!; stages.add(state.stage);
      if(state.activeGroup)groups.add(state.activeGroup);
      expect(["a","b","p"].filter((g)=>signals.canEnter(g)).length).toBe(state.stage==="amber"||state.stage==="clearance"?0:1);
      if(state.stage==="amber") { expect(state.activeGroup).toBeNull(); expect(["a","b"]).toContain(state.amberGroup); }
      signals.advance(1/60,()=>false);
    }
    expect([...stages].sort()).toEqual(["amber","clearance","pedestrian","vehicle"]);
    expect([...groups].sort()).toEqual(["a","b","p"]);
    expect(signals.snapshot()[0]!.cycle).toBeGreaterThanOrEqual(4);
  });
  it("holds all-red until every committed actor clears and does not count waiting queues",()=>{
    const signals=new SignalController([junction]);
    for(let i=0;i<60*10;i++)signals.advance(1/60,()=>true);
    expect(signals.snapshot()[0]).toMatchObject({stage:"clearance",activeGroup:null,clearanceHeld:true});
    const waiting={x:0,y:15,z:-13};
    expect(occupiesJunction(junction,waiting,0,4,0)).toBe(false);
    const tailInside={x:0,y:15,z:11};
    expect(occupiesJunction(junction,tailInside,0,4,0)).toBe(true);
    signals.advance(1/60,()=>occupiesJunction(junction,waiting,0,4,0));
    expect(signals.snapshot()[0]).toMatchObject({stage:"vehicle",activeGroup:"b",clearanceHeld:false});
  });
  it("produces identical observations regardless of rendering between fixed steps",()=>{
    const a=new SignalController([junction]),b=new SignalController([junction]);
    for(let tick=0;tick<60*65;tick++){a.advance(1/60,()=>tick%900>820);b.snapshot();b.snapshot();b.advance(1/60,()=>tick%900>820);}
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it("rejects malformed durations, duplicate groups, unknown groups and variable ticks",()=>{
    expect(()=>new SignalController([{...junction,clearanceSeconds:NaN}])).toThrow(/finite and positive/);
    expect(()=>new SignalController([{...junction,vehicleGroups:["a","a"]}])).toThrow(/duplicated/);
    const signals=new SignalController([junction]);
    expect(()=>signals.canEnter("missing")).toThrow(/no controller/);
    for(const dt of [0,-1,Infinity,NaN,1])expect(()=>signals.advance(dt,()=>false)).toThrow(/invalid/);
    signals.advance(1/60,()=>false);
    expect(()=>signals.advance(1/30,()=>false)).toThrow(/step changed/);
  });
});
