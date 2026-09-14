export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500">This module will be built in a future phase.</p>
      </div>
    </div>
  );
}
