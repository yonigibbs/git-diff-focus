import { AppShell } from "./components/layout/AppShell";
import { DiffView } from "./components/diff/DiffView";
import { useKeyboardNav } from "./hooks/useKeyboardNav";

function App() {
  useKeyboardNav();

  return (
    <AppShell>
      <DiffView />
    </AppShell>
  );
}

export default App;
