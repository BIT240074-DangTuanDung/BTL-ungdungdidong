# Debug Session: rooms-screen-crash

- **Session ID**: rooms-screen-crash
- **Project Root**: c:\Users\dangt\Hethongquanlytro
- **Status**: in_progress
- **Start Time**: 2026-11-02

## Symptoms
- Runtime error in `app/(tabs)/rooms.tsx` at line 104.
- Error occurs during rendering or interaction in the Rooms screen.
- Screenshot shows `map$argument_0` error, suggesting an issue inside a `.map()` call.

## Hypotheses
1. `room` object is undefined during the `.map()` execution in `rooms.tsx`.
2. `router` is not properly imported or initialized in `rooms.tsx`.
3. The `params` object in `router.push` is causing a type or runtime error.
4. `room.id` is missing or undefined in the room objects returned by the store.

## Evidence
- (Pending instrumentation)

## Progress
- [x] Initial hypotheses listed.
- [ ] Instrumentation added.
- [ ] Logs collected and analyzed.
- [ ] Root cause identified.
- [ ] Minimal fix implemented.
- [ ] Post-fix verification complete.
