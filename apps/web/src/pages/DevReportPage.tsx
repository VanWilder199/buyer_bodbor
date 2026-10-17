import { ReportView } from '@podbor/ui';
import { mockHeader, mockReport } from '../mocks/report';

/** Dev-витрина `ReportView` на моках. Только в dev-сборке (маршрут ниже отключается по `import.meta.env.DEV`). */
export function DevReportPage() {
  return <ReportView report={mockReport} header={mockHeader} showPrice />;
}