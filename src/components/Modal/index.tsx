'use client'

import React, { useEffect } from 'react'
import styles from './styles.module.scss'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: ModalSize
  className?: string
  bodyClassName?: string
}

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  size = 'md',
  className,
  bodyClassName,
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles[size]} ${className || ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className={`${styles.body} ${bodyClassName || ''}`}>{children}</div>
      </div>
    </div>
  )
}
