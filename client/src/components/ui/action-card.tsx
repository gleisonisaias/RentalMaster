import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  bgColor?: string;
  iconColor?: string;
}

const ActionCard = ({ 
  title, 
  description, 
  icon, 
  href, 
  bgColor = "bg-gradient-to-br from-primary-50 to-primary-100", 
  iconColor = "text-primary-500" 
}: ActionCardProps) => {
  return (
    <Card className="border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      <div className={`${bgColor} py-6 px-5 text-center flex items-center justify-center relative`}>
        <div className={`${iconColor} h-12 w-12 transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full opacity-10 bg-gradient-to-tr from-transparent to-neutral-900 -translate-x-4 -translate-y-4"></div>
      </div>
      <CardContent className="p-5 flex-1">
        <h3 className="text-lg font-medium text-neutral-900 mb-2 text-center">{title}</h3>
        <p className="text-sm text-neutral-600 text-center">{description}</p>
      </CardContent>
      <CardFooter className="px-5 pb-5 text-center">
        <Link 
          href={href} 
          className={`inline-flex items-center gap-1 ${iconColor} hover:brightness-90 text-sm font-medium transition-all px-3 py-1 rounded-full group-hover:bg-white/50`}
        >
          Gerenciar <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ActionCard;
