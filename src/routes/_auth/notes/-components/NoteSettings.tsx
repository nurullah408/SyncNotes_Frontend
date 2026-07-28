import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TNoteSettings } from "@/types/local-storage/NoteSettings";

export function NoteSettings({
  noteSettings,
  onChangeNoteSettings,
}: {
  noteSettings: TNoteSettings;
  onChangeNoteSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-1">
        <Label>Show Seconds?</Label>
        <Input
          name="showSeconds"
          className="size-4 accent-accent"
          type="checkbox"
          onChange={onChangeNoteSettings}
          checked={noteSettings.showSeconds}
        />
      </div>
      <div className="flex items-center justify-between gap-1">
        <Label>12 Hour Format?</Label>
        <Input
          name="hourFormat"
          className="size-4 accent-accent"
          type="checkbox"
          onChange={onChangeNoteSettings}
          checked={noteSettings.hourFormat === "12"}
        />
      </div>
    </div>
  );
}
