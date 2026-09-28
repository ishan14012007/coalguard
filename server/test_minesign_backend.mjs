/**
 * MineSign AI — Phase 2 Backend Integration Automated Verification Suite
 * Tests all endpoints, validation rules, notifications, audit trail, and duplicate suppression.
 */

import express from 'express';
import minesignRoutes from './routes/minesign.js';
import { mockStore } from './db/mockStore.js';
import { verifyAuditChain } from './utils/hashChain.js';

// Setup isolated express test instance
const app = express();
app.use(express.json());
app.use('/api/minesign', minesignRoutes);

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/minesign`;

async function runTests() {
  server = app.listen(PORT);
  console.log(`\n================================================================================`);
  console.log(`🧪 RUNNING MINESIGN PHASE 2 BACKEND INTEGRATION TESTS (${BASE_URL})`);
  console.log(`================================================================================\n`);

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(message);
    } else {
      passedTests++;
      console.log(`✅ PASS: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: INGESTION OF CANDIDATE GESTURES (PENDING_CONFIRMATION)
    // -------------------------------------------------------------
    console.log(`--- 1. Testing Candidate MineSign Gestures Ingestion (PENDING_CONFIRMATION) ---`);

    const testGestures = [
      { gesture: 'PPE_DAMAGE', worker_id: 'W001', confidence: 0.978, expectedPriority: 'HIGH' },
      { gesture: 'SUSPECTED_GAS_LEAK', worker_id: 'W001', confidence: 0.865, expectedPriority: 'CRITICAL' },
      { gesture: 'CRACK_WORSENING', worker_id: 'W002', confidence: 0.942, expectedPriority: 'CRITICAL' },
      { gesture: 'RESCUE_REQUIRED', worker_id: 'W001', confidence: 0.999, expectedPriority: 'CRITICAL' },
      { gesture: 'HAZARD_HERE', worker_id: 'W002', confidence: 0.925, expectedPriority: 'HIGH' }
    ];

    const candidateEvents = [];

    for (const item of testGestures) {
      const initialNotifCount = mockStore.notifications.length;
      const initialAuditCount = mockStore.audit_log.length;

      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture: item.gesture,
          worker_id: item.worker_id,
          confidence: item.confidence,
          mine_id: 'demo-mine',
          zone: 'Conveyor Zone 4',
          camera_id: 'CAM-MINESIGN-DEMO'
        })
      });

      assert(res.status === 201, `POST /events with ${item.gesture} returned HTTP 201`);
      const body = await res.json();
      assert(body.event_id.startsWith('event-minesig-'), `Event ID generated: ${body.event_id}`);
      assert(body.gesture === item.gesture, `Gesture matched: ${body.gesture}`);
      assert(body.priority === item.expectedPriority, `Priority correctly mapped: ${body.priority}`);
      assert(body.status === 'PENDING_CONFIRMATION', `Initial candidate status is strictly PENDING_CONFIRMATION`);
      assert(body.source === 'MineSign AI', `Source marked as MineSign AI`);
      assert(body.simulation_mode === true, `simulation_mode is true`);

      // Verify ZERO notifications created for PENDING_CONFIRMATION
      assert(mockStore.notifications.length === initialNotifCount, `0 notifications created before supervisor confirmation`);

      candidateEvents.push(body);
    }

    // -------------------------------------------------------------
    // TEST 1B: SUPERVISOR CONFIRMATION FLOW (PENDING_CONFIRMATION -> OPEN)
    // -------------------------------------------------------------
    console.log(`\n--- 1B. Testing Supervisor Confirmation Flow ---`);

    const confirmedEvents = [];
    // Confirm the first 4 events, leave 5th for rejection test
    for (let i = 0; i < 4; i++) {
      const cand = candidateEvents[i];
      const initialNotifCount = mockStore.notifications.length;
      const initialAuditCount = mockStore.audit_log.length;

      const resConf = await fetch(`${BASE_URL}/events/${cand.event_id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed_by: 'Er. Rajeshwar Verma (Colliery Supervisor)',
          confirmation_notes: 'Visual gesture verified via CAM-MINESIGN-DEMO.'
        })
      });

      assert(resConf.status === 200, `PATCH /events/${cand.event_id}/confirm returned HTTP 200`);
      const confBody = await resConf.json();
      assert(confBody.event.status === 'OPEN', `Event transitioned to OPEN upon confirmation`);
      assert(confBody.event.confirmed_by.includes('Rajeshwar Verma'), `Confirmed by recorded correctly`);

      // Verify Notification Creation ONLY upon confirmation
      assert(mockStore.notifications.length === initialNotifCount + 1, `Notification store incremented by 1 on confirmation`);
      const topNotif = mockStore.notifications[0];
      assert(topNotif.message.includes(cand.gesture), `Notification contains gesture name: ${topNotif.message}`);
      assert(topNotif.message.includes(cand.worker_id), `Notification contains worker ID: ${topNotif.message}`);

      // Verify Blockchain-Lite Audit Trail Entry
      assert(mockStore.audit_log.length === initialAuditCount + 1, `Audit log incremented by 1 on confirmation`);
      const topAudit = mockStore.audit_log[mockStore.audit_log.length - 1];
      assert(topAudit.entity_type === 'minesign_event', `Audit entity_type is 'minesign_event'`);
      assert(topAudit.action === 'GESTURE_EVENT_CONFIRMED', `Audit action is 'GESTURE_EVENT_CONFIRMED'`);
      assert(topAudit.payload.gesture === cand.gesture, `Audit payload contains gesture: ${topAudit.payload.gesture}`);
      assert(topAudit.current_hash.length === 64, `Audit block contains valid SHA-256 hash: ${topAudit.current_hash.slice(0, 16)}...`);

      confirmedEvents.push(confBody.event);
    }

    // -------------------------------------------------------------
    // TEST 1C: SUPERVISOR REJECTION FLOW (PENDING_CONFIRMATION -> REJECTED)
    // -------------------------------------------------------------
    console.log(`\n--- 1C. Testing Supervisor Rejection Flow ---`);

    const rejectCand = candidateEvents[4]; // 5th event (HAZARD_HERE)
    const notifCountBeforeReject = mockStore.notifications.length;
    const auditCountBeforeReject = mockStore.audit_log.length;

    const resReject = await fetch(`${BASE_URL}/events/${rejectCand.event_id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rejected_by: 'Er. Rajeshwar Verma',
        rejection_reason: 'Worker adjusted gear — false positive candidate.'
      })
    });

    assert(resReject.status === 200, `PATCH /events/${rejectCand.event_id}/reject returned HTTP 200`);
    const rejectBody = await resReject.json();
    assert(rejectBody.event.status === 'REJECTED', `Event status transitioned to REJECTED`);
    assert(rejectBody.event.rejected_by.includes('Rajeshwar Verma'), `Rejected by recorded correctly`);

    // Verify ZERO official safety notifications created on rejection
    assert(mockStore.notifications.length === notifCountBeforeReject, `0 notifications created for rejected candidate`);

    // Verify Rejection Audit Entry created
    assert(mockStore.audit_log.length === auditCountBeforeReject + 1, `Audit log recorded rejection record`);
    const rejectAudit = mockStore.audit_log[mockStore.audit_log.length - 1];
    assert(rejectAudit.action === 'GESTURE_EVENT_REJECTED', `Audit action is 'GESTURE_EVENT_REJECTED'`);
    assert(rejectAudit.payload.status === 'REJECTED', `Audit payload status is REJECTED`);

    // -------------------------------------------------------------
    // TEST 2: NO_GESTURE REJECTION (MUST NEVER CREATE EVENT)
    // -------------------------------------------------------------
    console.log(`\n--- 2. Testing Strict NO_GESTURE Rejection ---`);
    const notifCountBeforeNoGesture = mockStore.notifications.length;
    const auditCountBeforeNoGesture = mockStore.audit_log.length;
    const eventCountBeforeNoGesture = mockStore.minesign_events.length;

    const resNoGesture = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gesture: 'NO_GESTURE',
        worker_id: 'W001',
        confidence: 0.95,
        mine_id: 'demo-mine',
        zone: 'Conveyor Zone 4',
        camera_id: 'CAM-MINESIGN-DEMO'
      })
    });

    assert(resNoGesture.status === 400, `POST /events with NO_GESTURE returned HTTP 400 (Rejected)`);
    assert(mockStore.minesign_events.length === eventCountBeforeNoGesture, `0 backend events created for NO_GESTURE`);
    assert(mockStore.notifications.length === notifCountBeforeNoGesture, `0 notifications created for NO_GESTURE`);
    assert(mockStore.audit_log.length === auditCountBeforeNoGesture, `0 audit entries created for NO_GESTURE`);

    // -------------------------------------------------------------
    // TEST 3: INVALID GESTURE & VALIDATION ERRORS
    // -------------------------------------------------------------
    console.log(`\n--- 3. Testing Input Validation & Unknown Gesture Rejection ---`);

    // A. Unknown Gesture
    const resInvalidGesture = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gesture: 'UNKNOWN_RANDOM_DANCE',
        worker_id: 'W001',
        confidence: 0.95
      })
    });
    assert(resInvalidGesture.status === 400, `Unknown gesture rejected with HTTP 400`);

    // B. Invalid Confidence Range (< 0 or > 1)
    const resBadConf = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gesture: 'PPE_DAMAGE',
        worker_id: 'W001',
        confidence: 1.5
      })
    });
    assert(resBadConf.status === 400, `Confidence > 1.0 rejected with HTTP 400`);

    // C. Missing Worker ID
    const resNoWorker = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gesture: 'PPE_DAMAGE',
        confidence: 0.95
      })
    });
    assert(resNoWorker.status === 400, `Missing worker_id rejected with HTTP 400`);

    // -------------------------------------------------------------
    // TEST 4: DUPLICATE EVENT SUPPRESSION (5.0s Cooldown)
    // -------------------------------------------------------------
    console.log(`\n--- 4. Testing Backend Duplicate Event Suppression ---`);

    const notifCountBeforeDup = mockStore.notifications.length;
    const auditCountBeforeDup = mockStore.audit_log.length;

    // Resubmit HAZARD_HERE for W002 immediately (within 5s)
    const resDup = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gesture: 'HAZARD_HERE',
        worker_id: 'W002',
        confidence: 0.93,
        mine_id: 'demo-mine',
        zone: 'Conveyor Zone 4',
        camera_id: 'CAM-MINESIGN-DEMO'
      })
    });

    assert(resDup.status === 409, `Immediate duplicate submission rejected with HTTP 409 Conflict`);
    const dupBody = await resDup.json();
    assert(dupBody.error === 'Duplicate Suppressed', `Response confirms: '${dupBody.error}'`);
    assert(mockStore.notifications.length === notifCountBeforeDup, `0 duplicate notifications created`);
    assert(mockStore.audit_log.length === auditCountBeforeDup, `0 duplicate audit entries created`);

    // -------------------------------------------------------------
    // TEST 5: GET /api/minesign/events (List & Filter)
    // -------------------------------------------------------------
    console.log(`\n--- 5. Testing Event Listing & Filtering Endpoints ---`);

    const resListAll = await fetch(`${BASE_URL}/events`);
    const listAll = await resListAll.json();
    assert(resListAll.status === 200, `GET /events returned HTTP 200`);
    assert(listAll.total >= 5, `GET /events returned total >= 5 events (found ${listAll.total})`);

    const resFilterCritical = await fetch(`${BASE_URL}/events?priority=CRITICAL`);
    const listCritical = await resFilterCritical.json();
    assert(listCritical.events.every(e => e.priority === 'CRITICAL'), `Filtered priority=CRITICAL correctly (${listCritical.total} items)`);

    const resFilterWorker = await fetch(`${BASE_URL}/events?worker_id=W001`);
    const listWorker = await resFilterWorker.json();
    assert(listWorker.events.every(e => e.worker_id === 'W001'), `Filtered worker_id=W001 correctly (${listWorker.total} items)`);

    // -------------------------------------------------------------
    // TEST 6: GET /api/minesign/events/:id
    // -------------------------------------------------------------
    console.log(`\n--- 6. Testing Single Event Retrieval ---`);
    const targetEvent = confirmedEvents[0];
    const resGetSingle = await fetch(`${BASE_URL}/events/${targetEvent.event_id}`);
    const singleData = await resGetSingle.json();
    assert(resGetSingle.status === 200, `GET /events/:id returned HTTP 200`);
    assert(singleData.event_id === targetEvent.event_id, `Retrieved exact event ID: ${singleData.event_id}`);

    // -------------------------------------------------------------
    // TEST 7: ACKNOWLEDGE & RESOLVE EVENT LIFECYCLE
    // -------------------------------------------------------------
    console.log(`\n--- 7. Testing Event Lifecycle (ACKNOWLEDGE -> RESOLVE) ---`);

    // Acknowledge
    const resAck = await fetch(`${BASE_URL}/events/${targetEvent.event_id}/acknowledge`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acknowledged_by: 'Er. Rajeshwar Verma (Safety Officer)',
        action_notes: 'Safety technician dispatched to inspect helmet damage.'
      })
    });
    assert(resAck.status === 200, `PATCH /events/:id/acknowledge returned HTTP 200`);
    const ackData = await resAck.json();
    assert(ackData.event.status === 'ACKNOWLEDGED', `Event status transitioned to ACKNOWLEDGED`);
    assert(ackData.event.acknowledged_by.includes('Rajeshwar Verma'), `Acknowledged officer saved: ${ackData.event.acknowledged_by}`);

    // Resolve
    const resResolve = await fetch(`${BASE_URL}/events/${targetEvent.event_id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolved_by: 'Er. Rajeshwar Verma',
        resolution_notes: 'New BIS Type IV helmet issued to miner from colliery store.'
      })
    });
    assert(resResolve.status === 200, `PATCH /events/:id/resolve returned HTTP 200`);
    const resolveData = await resResolve.json();
    assert(resolveData.event.status === 'RESOLVED', `Event status transitioned to RESOLVED`);
    assert(resolveData.event.resolution_notes.includes('helmet issued'), `Resolution notes saved: ${resolveData.event.resolution_notes}`);

    // -------------------------------------------------------------
    // TEST 8: CRYPTOGRAPHIC AUDIT TRAIL CHAIN INTEGRITY
    // -------------------------------------------------------------
    console.log(`\n--- 8. Verifying Blockchain-Lite Audit Trail Integrity ---`);
    const chainVerification = verifyAuditChain(mockStore.audit_log);
    assert(chainVerification.isValid === true, `Cryptographic hash chain verified 100% valid with 0 corruptions across all ${mockStore.audit_log.length} blocks`);

    console.log(`\n================================================================================`);
    console.log(`🎉 ALL ${passedTests}/${totalTests} MINESIGN BACKEND INTEGRATION TESTS PASSED!`);
    console.log(`================================================================================\n`);

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
