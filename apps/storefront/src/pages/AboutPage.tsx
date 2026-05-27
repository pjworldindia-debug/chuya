import { Helmet } from 'react-helmet-async'

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — CHUYA</title>
        <meta name="description" content="The Story of Chuya: Crafting Modern Elegance. Learn about our mission, vision, and the inspiration behind our luxury handcrafted handbags." />
      </Helmet>

      <div className="section min-h-screen py-24" id="about-page">
        <div className="max-w-[800px] mx-auto px-6 md:px-12">
          
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-center mb-12">
            The Story of Chuya: Crafting Modern Elegance
          </h1>

          <div className="space-y-8 text-muted leading-relaxed text-[15px] md:text-base">
            <p>
              Welcome to Chuya, where the art of luxury meets the rhythm of everyday life. We are more than just a fashion label; we are a celebration of individuality, meticulous craftsmanship, and modern design.
            </p>
            <p>
              Born from a vision to redefine contemporary accessories, Chuya is dedicated to creating pieces that do not just complete an outfit, but elevate the very essence of the person wearing them.
            </p>

            <h2 className="font-serif text-2xl md:text-3xl text-chuya mt-12 mb-6">
              Our Genesis: The Spark of 2025
            </h2>
            <p>
              Every iconic brand starts with a simple, unwavering belief. For Chuya, that moment arrived in 2025.
            </p>
            <p>
              Our founder, Priyanshu Jain, always had an innate eye for aesthetics and a deep appreciation for high-end fashion. However, while observing the luxury market, Priyanshu noticed a subtle disconnect: luxury often felt too rigid, and everyday comfort rarely felt luxurious. There was a missing link between statement-making elegance and versatile, modern utility.
            </p>
            <p>
              Driven by this realization and fueled by countless late nights of sketching, sourcing premium materials, and studying the nuances of modern silhouettes, Priyanshu took a leap of faith. The goal was clear—to build a brand that refuses to compromise on quality while embracing the dynamic lifestyles of today's generation. Thus, Chuya was brought to life.
            </p>

            <h2 className="font-serif text-2xl md:text-3xl text-chuya mt-12 mb-6">
              The Inspiration Behind the Vision
            </h2>
            <p>
              Every grand vision has a unique catalyst, and for Chuya, that foundational spark came from a deeply meaningful source of inspiration: Jumbo. It was through Jumbo that the initial idea for the brand truly took shape and blossomed into a reality. This pivotal muse became the driving force behind our mission, reminding us that the most extraordinary concepts often stem from personal, unexpected moments. It is this very inspiration that continues to breathe life into our designs, blending bold presence with everyday elegance.
            </p>

            <h2 className="font-serif text-2xl md:text-3xl text-chuya mt-12 mb-6">
              The Art of the Collection
            </h2>
            <p>
              At Chuya, every stitch tells a story. Our collections are thoughtfully curated to cater to diverse tastes and needs, ensuring that there is a perfect companion for every journey:
            </p>
            <ul className="space-y-4 ml-4 md:ml-8 list-disc">
              <li><strong>Luxury Female Handbags:</strong> The crown jewels of our collection. Crafted for the modern woman who commands the room, these handbags are a seamless blend of timeless elegance and bold contemporary lines.</li>
              <li><strong>Exquisite Clutches:</strong> Designed for your most memorable evenings. Our clutches are intricate, sophisticated, and designed to be the ultimate statement piece in the palm of your hand.</li>
              <li><strong>Unisex Tote Bags:</strong> Fashion has no boundaries, and neither do our totes. Spacious, incredibly durable, and effortlessly chic, these bags are designed for anyone who carries their world with them, regardless of gender.</li>
              <li><strong>The Puffy Bags:</strong> Merging high-fashion trends with tactile comfort. Our puffy bags are playful, bold, and cloud-like, offering a fresh, modern aesthetic that turns heads wherever you go.</li>
            </ul>

            <h2 className="font-serif text-2xl md:text-3xl text-chuya mt-12 mb-6">
              Our Philosophy: Luxury with a Soul
            </h2>
            <p>
              To us, luxury is not just about a price tag or a logo; it is an experience. It is the feeling of running your hands over premium textures, the confidence you feel when you step out the door, and the knowledge that your bag was crafted with passion and precision.
            </p>
            <p>
              As a founder-led brand, Priyanshu Jain’s personal touch is woven into the very fabric of Chuya. We believe in ethical craftsmanship, attention to the smallest details, and creating designs that outlast fleeting trends. We are constantly innovating, yet we remain deeply rooted in the classic principles of design.
            </p>

            <h2 className="font-serif text-2xl md:text-3xl text-chuya mt-12 mb-6">
              Join the Journey
            </h2>
            <p>
              What started in 2025 as a passionate dream has now grown into a haven for bag lovers who seek something extraordinary. Whether you are stepping into a boardroom, attending a gala, or simply wandering through the city on a Sunday afternoon, Chuya is designed to be right by your side.
            </p>
            <p>
              Thank you for being a part of our story. We invite you to explore our collections and find the piece that speaks to yours.
            </p>

            <div className="mt-16 text-center">
              <img 
                src="/about-image.jpeg" 
                alt="Chuya Inspiration" 
                className="w-full max-w-[500px] mx-auto mb-8 shadow-lg"
              />
              <p className="font-serif text-xl md:text-2xl text-chuya italic">
                Welcome to the world of Chuya.
              </p>
              <p className="mt-2 tracking-widest uppercase text-sm font-medium">
                — Priyanshu Jain, Founder
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
