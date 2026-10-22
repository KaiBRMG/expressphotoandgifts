"use client";

import { Tabs } from "@mantine/core";

export type RecordTab = { value: string; label: string; count?: number; alert?: boolean; panel: React.ReactNode };

/** The order's records, one tab open at a time; a tab with something wrong in it carries a red dot. */
export function RecordTabs({ tabs, first }: { tabs: RecordTab[]; first: string }) {
  return (
    <section className="osec orecords" aria-label="Records">
      <Tabs defaultValue={first} classNames={{ list: "orecords__list", tab: "orecords__tab", panel: "orecords__panel" }}>
        <Tabs.List>
          {tabs.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} rightSection={t.alert ? <span className="orecords__dot" aria-hidden="true" /> : t.count ? <span className="orecords__count">{t.count}</span> : null}>
              {t.label}
              {t.alert ? <span className="visually-hidden">, needs a look</span> : null}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((t) => (
          <Tabs.Panel key={t.value} value={t.value}>
            {t.panel}
          </Tabs.Panel>
        ))}
      </Tabs>
    </section>
  );
}
