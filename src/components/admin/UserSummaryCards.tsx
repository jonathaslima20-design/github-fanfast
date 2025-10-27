import { Users, Shield, Ban, Crown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/types';

interface UserSummaryCardsProps {
  users: User[];
}

export function UserSummaryCards({ users }: UserSummaryCardsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => !user.is_blocked).length;
  const blockedUsers = users.filter(user => user.is_blocked).length;
  const activePlans = users.filter(user => user.plan_status === 'active').length;
  const adminUsers = users.filter(user => user.role === 'admin').length;
  const partnerUsers = users.filter(user => user.role === 'parceiro').length;
  const corretorUsers = users.filter(user => user.role === 'corretor').length;

  const cards = [
    {
      title: 'Total de Usuários',
      value: totalUsers,
      description: 'Usuários cadastrados',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      title: 'Usuários Ativos',
      value: activeUsers,
      description: 'Não bloqueados',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      title: 'Planos Ativos',
      value: activePlans,
      description: 'Com assinatura ativa',
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      title: 'Usuários Bloqueados',
      value: blockedUsers,
      description: 'Acesso suspenso',
      icon: Ban,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}