import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  bgColor?: string;
  href?: string;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  iconBgColor,
  iconColor,
  bgColor = "bg-white",
  href
}: StatCardProps) => {
  const cardContent = (
    <CardContent className={`p-5 relative overflow-hidden ${bgColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
          <p className="text-3xl font-semibold text-neutral-900 mt-2">{value}</p>
          <p className="text-xs text-neutral-500 mt-1">{description}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center shadow-sm`}>
          <div className={`h-5 w-5 ${iconColor}`}>{icon}</div>
        </div>
      </div>
      
      {/* Decorative gradient background */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-tr from-transparent to-current" style={{ color: iconColor.replace('text-', '') }}></div>
    </CardContent>
  );

  const cardClasses = "border border-neutral-200 shadow-sm transition-all duration-200 overflow-hidden";
  const cardWithHoverClasses = href ? `${cardClasses} cursor-pointer hover:shadow-md hover:border-neutral-300` : cardClasses;

  return href ? (
    <Link href={href}>
      <Card className={cardWithHoverClasses}>
        {cardContent}
      </Card>
    </Link>
  ) : (
    <Card className={cardClasses}>
      {cardContent}
    </Card>
  );
};

export default StatCard;
