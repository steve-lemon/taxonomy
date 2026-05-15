export function PlaceholderScreen({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full p-8 text-center text-ink-dim">
       <div>
         <h2 className="text-[28px] font-serif text-ink mb-2 font-normal">{name} Screen</h2>
         <p className="text-[13px]">This screen is pending implementation. Feel free to extend!</p>
       </div>
    </div>
  );
}
