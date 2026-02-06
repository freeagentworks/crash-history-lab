import presetData from "../../config/presets.json";

type PresetItem = {
  label: string;
  symbol: string;
};

type PresetGroup = {
  id: string;
  label: string;
  symbols: PresetItem[];
};

type PresetConfig = {
  groups: PresetGroup[];
};

const config = presetData as PresetConfig;

export const presetGroups = config.groups;
export const flatPresetSymbols = config.groups.flatMap((group) => group.symbols);
