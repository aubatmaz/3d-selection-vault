'use client';
import { useId, useState, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
type DisclosureProps = {
  title: string;
  children?: ReactNode;
  initiallyOpen?: boolean;
  scopeKey?: string;
};
export function DetailDisclosure(props: DisclosureProps) {
  return <DisclosureBody key={props.scopeKey} {...props} />;
}
function DisclosureBody({
  title,
  children,
  initiallyOpen = false,
}: DisclosureProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return (
    <section className="detail-section">
      <h3>
        <button
          type="button"
          className={buttonVariants({
            variant: 'ghost',
            className: 'disclosure-toggle',
          })}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {title}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
      </h3>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
