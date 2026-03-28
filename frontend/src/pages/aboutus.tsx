import { Link } from "react-router-dom";
import PublicNavbar from "@/components/shared/public-navbar";
import PublicFooter from "@/components/shared/public-footer";
import { CheckCircle2, Lightbulb, ShieldCheck, Wrench } from "lucide-react";

export default function AboutUs() {
  return (
    <>
      <PublicNavbar activePage="about" />

      <div className="flex min-h-screen flex-col items-center overflow-x-hidden bg-gradient-to-br from-[#242424] to-[#000000] p-6 text-[#EDEDEC] lg:p-8">
        {/* Spotlight Effect */}
        <div className="pointer-events-none absolute top-0 left-1/2 z-0 h-screen w-full max-w-full -translate-x-1/2 overflow-hidden">
          <div className="bg-gradient-radial absolute top-0 left-1/2 h-64 w-[1603px] max-w-[200vw] -translate-x-1/2 rounded-full from-yellow-200/25 via-yellow-100/15 to-transparent blur-3xl"></div>
        </div>

        <div className="h-24"></div>

        <main className="relative z-10 w-full max-w-5xl px-4">
          {/* Page Title */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold text-[#D9AF01]">About Us</h1>
            <p className="text-lg text-gray-400">
              Where Cosmic Care Meets Automotive Excellence
            </p>
          </div>

          {/* Our Story Section */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-[#D9AF01]">
              Our Story
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-300">
              Founded in 2015, AlienCare Autoshop emerged from a simple belief:
              every vehicle deserves out-of-this-world care. What started as a
              small garage with big dreams has evolved into the region's most
              trusted automotive service center.
            </p>
            <p className="text-base leading-relaxed text-gray-300">
              Our name reflects our mission – to provide care that's simply
              otherworldly. We combine cutting-edge technology with
              old-fashioned dedication to deliver service that exceeds
              expectations.
            </p>
          </section>

          {/* Mission & Vision */}
          <div className="mb-16 grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-[#D9AF01]">
                Our Mission
              </h2>
              <p className="text-base leading-relaxed text-gray-300">
                To provide exceptional automotive care through expert
                craftsmanship, honest service, and innovative solutions that
                keep our customers safe and satisfied on every journey.
              </p>
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-[#D9AF01]">
                Our Vision
              </h2>
              <p className="text-base leading-relaxed text-gray-300">
                To be the galaxy's premier automotive service provider,
                recognized for excellence, integrity, and customer care that's
                truly out of this world.
              </p>
            </div>
          </div>

          {/* Core Values */}
          <section className="mb-16">
            <h2 className="mb-10 text-center text-2xl font-semibold text-[#D9AF01]">
              Our Core Values
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <Wrench className="mb-4 h-8 w-8 text-[#D9AF01]" />
                <h3 className="mb-3 text-lg font-semibold text-[#D9AF01]">
                  Excellence
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  We strive for perfection in every service, no matter how big
                  or small.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <ShieldCheck className="mb-4 h-8 w-8 text-[#D9AF01]" />
                <h3 className="mb-3 text-lg font-semibold text-[#D9AF01]">
                  Integrity
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  Honest assessments and transparent pricing – always.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Lightbulb className="mb-4 h-8 w-8 text-[#D9AF01]" />
                <h3 className="mb-3 text-lg font-semibold text-[#D9AF01]">
                  Innovation
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  Using the latest technology to solve automotive challenges.
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-[#D9AF01]">
              Why Choose AlienCare?
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D9AF01]" />
                <span className="text-base text-gray-300">
                  <strong>Certified Technicians:</strong> Our team is ASE
                  certified with decades of combined experience
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D9AF01]" />
                <span className="text-base text-gray-300">
                  <strong>State-of-the-Art Equipment:</strong> We invest in the
                  latest diagnostic and repair technology
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D9AF01]" />
                <span className="text-base text-gray-300">
                  <strong>Transparent Pricing:</strong> No hidden fees or
                  surprise charges
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D9AF01]" />
                <span className="text-base text-gray-300">
                  <strong>Warranty on All Work:</strong> We stand behind every
                  service we provide
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#D9AF01]" />
                <span className="text-base text-gray-300">
                  <strong>Customer-First Approach:</strong> Your satisfaction is
                  our top priority
                </span>
              </li>
            </ul>
          </section>

          {/* Call to Action */}
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-[#EDEDEC]">
              Ready to Experience the Difference?
            </h2>
            <p className="mb-6 text-base text-gray-300">
              Join thousands of satisfied customers who trust AlienCare with
              their vehicles.
            </p>
            <Link
              to="/#services"
              className="inline-block rounded-sm bg-[#D9AF01] px-8 py-3 text-sm font-semibold text-[#1b1b18] transition-all duration-300 hover:bg-[#c29d01]"
            >
              View Our Services
            </Link>
          </div>
        </main>

        <div className="h-16"></div>
      </div>

      <PublicFooter />
    </>
  );
}
