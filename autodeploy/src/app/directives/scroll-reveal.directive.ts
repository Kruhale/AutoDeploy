import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[scrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() scrollReveal: 'arriba' | 'izquierda' | 'derecha' | 'escala' = 'arriba';
  @Input() retraso = 0;

  private observer!: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const elem = this.el.nativeElement;
    elem.classList.add('revelar', `revelar--${this.scrollReveal}`);
    elem.style.setProperty('--retraso', `${this.retraso}ms`);

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          elem.classList.add('revelar--visible');
          this.observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );

    this.observer.observe(elem);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
