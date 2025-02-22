import { PanoramicViewer } from "@/components";

export default function Home() {
  return (
    <section id="home">
      <div className="w-full h-screen">
        <PanoramicViewer imagePath={"/panoramic.jpg"} />
      </div>
    </section>
  );
}
