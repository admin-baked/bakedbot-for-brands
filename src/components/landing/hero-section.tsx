import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl blur-3xl opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full mix-blend-multiply animate-blob" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto z-10">
        <Badge variant="secondary" className="px-4 py-2 text-sm border-primary/20 backdrop-blur-sm bg-background/50 animate-fade-in-up">
          <Bot className="w-4 h-4 mr-2 text-primary" />
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-medium">
            Agentic Commerce OS v1.0
          </span>
        </Badge>

        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl font-teko uppercase animate-fade-in-up animation-delay-100">
          Build a Cannabis Empire with <br />
          <span className="text-primary">Autonomous Agents</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl animate-fade-in-up animation-delay-200">
          Stop manually managing menus, emails, and compliance. Deploy a team of AI specialists that work 24/7 to grow your brand, drive foot traffic, and automate your operations.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-fade-in-up animation-delay-300">
          <Link href="/brand-login">
            <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              Deploy Your Agents
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto backdrop-blur-sm bg-background/50">
              See Live Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
