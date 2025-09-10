"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Filter } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface FilterCondition {
  id: string
  type: "level" | "stream" | "message" | "time"
  operator: "equals" | "contains" | "not_contains" | "before" | "after"
  value: string
  label: string
}

interface AdvancedFiltersProps {
  onFiltersChange: (conditions: FilterCondition[]) => void
}

export function AdvancedFilters({ onFiltersChange }: AdvancedFiltersProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      type: "level",
      operator: "equals",
      value: "",
      label: "",
    }
    const newConditions = [...conditions, newCondition]
    setConditions(newConditions)
    onFiltersChange(newConditions)
  }

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    const newConditions = conditions.map((condition) =>
      condition.id === id ? { ...condition, ...updates } : condition,
    )
    setConditions(newConditions)
    onFiltersChange(newConditions)
  }

  const removeCondition = (id: string) => {
    const newConditions = conditions.filter((condition) => condition.id !== id)
    setConditions(newConditions)
    onFiltersChange(newConditions)
  }

  const clearAllConditions = () => {
    setConditions([])
    onFiltersChange([])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              高度なフィルタ
              {conditions.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {conditions.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">フィルタ条件</h4>
                {conditions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllConditions}>
                    すべてクリア
                  </Button>
                )}
              </div>

              {conditions.map((condition) => (
                <div key={condition.id} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">条件 {conditions.indexOf(condition) + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(condition.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={condition.type}
                      onValueChange={(value) => updateCondition(condition.id, { type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="level">レベル</SelectItem>
                        <SelectItem value="stream">ストリーム</SelectItem>
                        <SelectItem value="message">メッセージ</SelectItem>
                        <SelectItem value="time">時間</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">等しい</SelectItem>
                        <SelectItem value="contains">含む</SelectItem>
                        <SelectItem value="not_contains">含まない</SelectItem>
                        {condition.type === "time" && (
                          <>
                            <SelectItem value="before">より前</SelectItem>
                            <SelectItem value="after">より後</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    {condition.type === "level" ? (
                      <Select
                        value={condition.value}
                        onValueChange={(value) => updateCondition(condition.id, { value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="error">エラー</SelectItem>
                          <SelectItem value="warn">警告</SelectItem>
                          <SelectItem value="info">情報</SelectItem>
                          <SelectItem value="debug">デバッグ</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : condition.type === "stream" ? (
                      <Select
                        value={condition.value}
                        onValueChange={(value) => updateCondition(condition.id, { value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stdout">標準出力</SelectItem>
                          <SelectItem value="stderr">標準エラー</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="値を入力"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              ))}

              <Button onClick={addCondition} variant="outline" className="w-full bg-transparent">
                条件を追加
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {conditions.map((condition) => (
          <Badge key={condition.id} variant="secondary" className="gap-1">
            {condition.type}: {condition.value}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(condition.id)}
              className="h-3 w-3 p-0 hover:bg-transparent"
            >
              <X className="h-2 w-2" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
