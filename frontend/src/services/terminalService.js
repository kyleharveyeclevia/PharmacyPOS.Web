export function isTerminalActivated() {
  return !!localStorage.getItem('terminalGuid');
}

export function getTerminalGuid() {
  return localStorage.getItem('terminalGuid');
}