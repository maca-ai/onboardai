# reviewer checklist

## run

- tool:
- flow id:
- run id:
- reviewer:
- date:
- substrate: real-tool

## evidence reviewed

- final screen:
- step trace:
- capture-to-flow mapping:
- normalized capture manifest:
- redacted capture frames:
- held-out eval observations:
- eval recording:
- failure log:
- no-privileged-access statement:

## checks

- [ ] each taught step was correct
- [ ] no required step was missing
- [ ] terminal business state was reached
- [ ] terminal visible text matched
- [ ] no human help was used during eval
- [ ] no api/backend/database/dom/selector/mcp/computer-use proof access was used
- [ ] overlay did not invent steps
- [ ] eval observations were held out from capture frames
- [ ] every highlighted target had confidence at or above 0.75
- [ ] below-threshold behavior failed closed with the exact required message
- [ ] raw capture remained unsafe-to-share and excluded from git

## reviewer verdict

- accepted:
- rejected:
- notes:
