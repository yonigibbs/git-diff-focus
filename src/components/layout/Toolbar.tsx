import { TokenInput } from "../github/TokenInput";
import { PRInput } from "../github/PRInput";

export function Toolbar() {
  return (
    <div className="border-b border-gray-700 px-4 py-3 space-y-3">
      <TokenInput />
      <PRInput />
    </div>
  );
}
