import React from "react";
import { computeFixtureCellColor } from "../lib/fdr.js";

export function FixturesMatrixRow({
  row,
  idx,
  teamMap,
  ratingsMap,
  gwColWidth,
  cellMin,
  FIX_GAP,
  GAP_PX,
  TEAM_COL_PX,
  ATK_COL_PX,
  DEF_COL_PX,
  AVG_COL_PX,
  AVGATK_COL_PX,
  AVGDEF_COL_PX,
  STAR_PX,
  sortBy = "fdr",
  ratingsEditable = true,
  StarEditor,
}) {
  return (
    <tr
      style={{ background: idx % 2 ? "#320038" : "#2d0030" }}
      key={row.teamId}
    >
      <td
        className="font-medium whitespace-nowrap"
        style={{
          width: TEAM_COL_PX,
          minWidth: TEAM_COL_PX,
          maxWidth: TEAM_COL_PX,
          background: "inherit",
        }}
      >
        <div className="p-1 text-[10px] font-medium truncate" title={row.name}>
          {row.name}
        </div>
      </td>
      <td
        style={{
          width: ATK_COL_PX,
          minWidth: ATK_COL_PX,
          maxWidth: ATK_COL_PX,
          background: "inherit",
        }}
      >
        <div className="py-1 pl-1 pr-0 text-[10px]">
          <StarEditor
            value={(ratingsMap[row.teamId]?.attack ?? 1.5) * (5 / 3)}
            readOnly={!ratingsEditable}
            size={STAR_PX}
            onChange={(stars) => {
              if (!ratingsEditable) return;
              const val = (stars / 5) * 3;
              window.dispatchEvent(
                new CustomEvent("ratings:rowEdit", {
                  detail: { teamId: row.teamId, field: "attack", value: val },
                })
              );
            }}
          />
        </div>
      </td>
      <td
        aria-hidden
        style={{
          width: GAP_PX,
          minWidth: GAP_PX,
          maxWidth: GAP_PX,
          padding: 0,
          background: "inherit",
        }}
      />
      <td
        style={{
          width: DEF_COL_PX,
          minWidth: DEF_COL_PX,
          maxWidth: DEF_COL_PX,
          background: "inherit",
        }}
      >
        <div className="py-1 pl-1 pr-0 text-[10px]">
          <StarEditor
            value={(ratingsMap[row.teamId]?.defense ?? 1.5) * (5 / 3)}
            readOnly={!ratingsEditable}
            size={STAR_PX}
            onChange={(stars) => {
              if (!ratingsEditable) return;
              const val = (stars / 5) * 3;
              window.dispatchEvent(
                new CustomEvent("ratings:rowEdit", {
                  detail: { teamId: row.teamId, field: "defense", value: val },
                })
              );
            }}
          />
        </div>
      </td>
      <td
        aria-hidden
        style={{
          width: GAP_PX,
          minWidth: GAP_PX,
          maxWidth: GAP_PX,
          padding: 0,
          background: "inherit",
        }}
      />
      <td
        style={{
          width: AVG_COL_PX,
          minWidth: AVG_COL_PX,
          maxWidth: AVG_COL_PX,
          background: "inherit",
        }}
      >
        <div className="py-1 pl-1 pr-0 text-[10px] font-medium">
          {row.avg.toFixed(2)}
        </div>
      </td>
      <td
        aria-hidden
        style={{
          width: GAP_PX,
          minWidth: GAP_PX,
          maxWidth: GAP_PX,
          padding: 0,
          background: "inherit",
        }}
      />
      <td
        style={{
          width: AVGATK_COL_PX,
          minWidth: AVGATK_COL_PX,
          maxWidth: AVGATK_COL_PX,
          background: "inherit",
        }}
      >
        <div className="py-1 px-1 text-[10px] font-medium text-center">
          {row.avgAtk.toFixed(2)}
        </div>
      </td>
      <td
        aria-hidden
        style={{
          width: GAP_PX,
          minWidth: GAP_PX,
          maxWidth: GAP_PX,
          padding: 0,
          background: "inherit",
        }}
      />
      <td
        style={{
          width: AVGDEF_COL_PX,
          minWidth: AVGDEF_COL_PX,
          maxWidth: AVGDEF_COL_PX,
          background: "inherit",
        }}
      >
        <div className="py-1 px-1 text-[10px] font-medium text-center">
          {row.avgDef.toFixed(2)}
        </div>
      </td>
      <td
        aria-hidden
        style={{
          width: GAP_PX,
          minWidth: GAP_PX,
          maxWidth: GAP_PX,
          padding: 0,
          background: "inherit",
        }}
      />
      {row.cells.map((c, cIdx) => {
        const opp = c.oppId ? teamMap.get(c.oppId) : null;
        const teamRating = ratingsMap[row.teamId] || {
          attack: 1.5,
          defense: 1.5,
        };
        const oppRating = opp
          ? ratingsMap[opp.fplId] || { attack: 1.5, defense: 1.5 }
          : { attack: 1.5, defense: 1.5 };

        let colorMode = "avg";
        if (sortBy === "avgAtk") {
          colorMode = "atk";
        } else if (sortBy === "avgDef") {
          colorMode = "def";
        }

        const color = computeFixtureCellColor({
          teamName: row.name,
          oppName: opp?.name || c.text,
          isHome: !!c.isHome,
          teamAttack: teamRating.attack,
          teamDefense: teamRating.defense,
          oppAttack: oppRating.attack,
          oppDefense: oppRating.defense,
          mode: colorMode,
        });
        return (
          <td
            key={c.gw}
            className="py-1 px-0 text-center"
            style={{ width: gwColWidth, minWidth: cellMin }}
          >
            <div
              className="rounded-md px-1.5 py-1 font-semibold text-[10px]"
              title={`GW${c.gw} • ${c.text} • score ${c.score.toFixed(2)}`}
              style={{
                background: color,
                color: "rgba(10,10,10,0.9)",
                marginRight: cIdx === row.cells.length - 1 ? 0 : FIX_GAP,
              }}
            >
              {c.text}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export default FixturesMatrixRow;
