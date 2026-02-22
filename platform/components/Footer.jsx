export default function Footer() {
  return (
    <footer className="w-full py-6 text-center text-gray-400 text-sm bg-black/80 backdrop-blur-sm border-t border-white/10 mt-auto">
      <p>© {new Date().getFullYear()} Unified Physics Platform. All rights reserved.</p>
    </footer>
  );
}
