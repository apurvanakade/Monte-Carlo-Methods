/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulation behind mmn.qmd: a discrete-event M/M/n queue. Imported by
// the page's OJS cells and by mmn.method.test.js. Reads the mathviz library
// as globalThis.VM; no DOM, no OJS.

// Discrete-event simulation of an M/M/n queue until maxCustomers have
// departed. Events are kept in a list sorted by time (a heap would be
// faster; a thousand customers don't need one). Returns each customer's
// arrival, service-start and departure times and the queue length after
// every event.
export function mmnSimulate({arrivalRate, serviceRate, servers, maxCustomers, seed}) {
  const VM = globalThis.VM
  const rng = VM.sampling.seededRandom(seed)
  const interArrival = VM.sampling.exponentialRandom(rng, arrivalRate)
  const serviceTime = VM.sampling.exponentialRandom(rng, serviceRate)
  const events = []
  function schedule(time, type, id) {
    let k = events.length
    while (k > 0 && events[k - 1].time > time) k--
    events.splice(k, 0, {time, type, id})
  }
  const arrival = [], start = [], departure = []
  const waiting = []
  const log = {times: [], lengths: []}
  let busy = 0
  let departed = 0
  let nextId = 1
  schedule(interArrival(), "arrival", 0)
  while (events.length > 0 && departed < maxCustomers) {
    const event = events.shift()
    const clock = event.time
    log.times.push(clock)
    log.lengths.push(waiting.length)
    if (event.type === "arrival") {
      arrival[event.id] = clock
      if (busy < servers) {
        busy++
        start[event.id] = clock
        schedule(clock + serviceTime(), "departure", event.id)
      } else {
        waiting.push(event.id)
      }
      if (nextId < maxCustomers) {
        schedule(clock + interArrival(), "arrival", nextId)
        nextId++
      }
    } else {
      departure[event.id] = clock
      departed++
      busy--
      if (waiting.length > 0) {
        const next = waiting.shift()
        busy++
        start[next] = clock
        schedule(clock + serviceTime(), "departure", next)
      }
    }
  }
  return {arrivalRate, serviceRate, servers, arrival, start, departure, log}
}

// Per-customer waiting times (arrival to service start) and sojourn times
// (arrival to departure) over the customers who have departed.
export function waitAndSojourn(sim) {
  const waits = [], sojourns = []
  for (let id = 0; id < sim.departure.length; id++) {
    if (sim.departure[id] === undefined) continue
    waits.push(sim.start[id] - sim.arrival[id])
    sojourns.push(sim.departure[id] - sim.arrival[id])
  }
  return {waits, sojourns}
}
