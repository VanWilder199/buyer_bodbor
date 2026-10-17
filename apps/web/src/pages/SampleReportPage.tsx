import { Button } from '@podbor/ui/components/ui/button';
import { ReportView } from '@podbor/ui';
import { Link } from 'react-router-dom';
import { mockHeader, mockReport } from '../mocks/report';

/** WEB-14: пример отчёта, чтобы показать ценность до оплаты. */
export function SampleReportPage() {
  return (
    <div className="space-y-4 pb-10">
      <div className="rounded-control bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground">
        Это пример отчёта. Так выглядит результат осмотра после покупки.
      </div>
      <ReportView report={mockReport} header={mockHeader} showPrice />
      <Link to="/" className="block">
        <Button block size="lg">
          Найти свою машину
        </Button>
      </Link>
    </div>
  );
}