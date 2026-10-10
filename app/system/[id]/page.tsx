import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SystemView } from "@/components/library/SystemView";
import { getSystem, systems } from "@/lib/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return systems.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getSystem(id)?.name };
}

export default async function SystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getSystem(id)) notFound();
  return <SystemView id={id} />;
}
